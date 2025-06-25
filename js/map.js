async function main() {
    const provinceLabelConfig = await fetch('data/vietnam_label.json').then(res => res.json());
    console.log(provinceLabelConfig)

    const map = L.map("map", {
        center: [16.0, 108.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false,
    });

    // Bản đồ nền không có nhãn
    // https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png
    // https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png

    // Lớp nền không có nhãn
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
        subdomains: "abcd",
        maxZoom: 18
    }).addTo(map);

    // Lớp nhãn tiếng Việt, có Biển Đông, Hoàng Sa, Trường Sa
    L.tileLayer("https://tiles.arcgis.com/tiles/EaQ3hSM51DBnlwMq/arcgis/rest/services/VietnamLabels/MapServer/tile/{z}/{y}/{x}", {
        attribution: '&copy; ArcGIS VietnamLabels',
        maxZoom: 18
    }).addTo(map);


    const visited = new Set();
    const provinceLabels = [];

    function getProvinceStyle(name) {
        return {
            color: "#ffffff00",
            weight: 1,
            fillColor: visited.has(name) ? "#2ecc71" : "#ffffff00",
            fillOpacity: 0.6,
        };
    }

    d3.json("data/vietnam_provinces.geojson").then((data) => {
        const combined = turf.combine(data);
        L.geoJson(combined, {
            style: {
                fillColor: "#f9fcff",
                fillOpacity: 0,
                color: "#3a5f37b3",
                weight: 1,
            }
        }).addTo(map);

        L.geoJson(data, {
            style: (feature) => getProvinceStyle(feature.properties.ten),
            onEachFeature: function (feature, layer) {
                const name = feature.properties.ten;
                const popupContent = `
        <strong>${name}</strong><br/>
        `;

                layer.on("click", function () {
                    if (visited.has(name)) {
                        visited.delete(name);
                    } else {
                        visited.add(name);
                    }
                    layer.setStyle(getProvinceStyle(name));
                    layer.bindPopup(popupContent).openPopup();
                });

                try {
                    // const center = turf.center(feature).geometry.coordinates.reverse();
                    const config = provinceLabelConfig[name];
                    const center = config?.position
                        ? [config.position[0], config.position[1]]
                        : turf.center(feature).geometry.coordinates.reverse();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: "province-label",
                            html: name,
                            iconSize: [100, 20]
                        })
                    });
                    label.addTo(map);
                    provinceLabels.push({ name, label, minZoom: config?.minZoom ?? 7, maxZoom: config?.maxZoom ?? 15 });
                } catch (e) {
                    console.warn("Không lấy được tâm cho", name);
                }
            }
        }).addTo(map);
    });

    // Ẩn/hiện nhãn theo độ zoom
    map.on("zoomend", () => {
        const zoom = map.getZoom();

        provinceLabels.forEach(({ name, label, minZoom, maxZoom }) => {
            if (zoom >= minZoom & zoom <= maxZoom) {
                if (!map.hasLayer(label)) map.addLayer(label);
            } else {
                map.removeLayer(label);
            }
        });
    });
}
main()
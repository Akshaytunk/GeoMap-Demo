(function() {
    let template = document.createElement("template");
    var gPassedServiceType;
    var gPassedPortalURL;
    var gPassedAPIkey;
    var gWebmapInstantiated = 0;
    var gMyLyr;
    var gMyWebmap;
    var gPassedRadiusKm;
    var gView; // Store the view reference

    template.innerHTML = `
        <link rel="stylesheet" href="https://js.arcgis.com/4.18/esri/themes/light/main.css">
        <style>
        #mapview { width: 100%; height: 100%; }
        #timeSlider { position: absolute; left: 5%; right: 15%; bottom: 20px; }
        </style>
        <div id='mapview'></div>
        <div id='timeSlider'></div>
    `;

    function applyDefinitionQuery() {
        if (!gMyWebmap) return;
        var svcLyr = gMyWebmap.findLayerById('daed1167baed413a9e38f47ea81b0fab'); 
        if (!svcLyr) return;

        svcLyr.visible = true;
        svcLyr.when(function() {
            gMyLyr = svcLyr.findSublayerById(6);
            if (gMyLyr) {
                gMyLyr.visible = true;
            }
        });
    };

    class Map extends HTMLElement {
        constructor() {
            super();
            this._shadowRoot = this.attachShadow({ mode: "open" });
            this._shadowRoot.appendChild(template.content.cloneNode(true));
            this._props = {};

            // Internal storage for properties
            this._portalurl = "";
            this._apikey = "";
            this._servicelevel = 0;
            this._radiuskm = 30;
            this._lat = 0;
            this._lon = 0;

            let that = this;

            require([
                "esri/config",
                "esri/WebMap",
                "esri/views/MapView",
                "esri/widgets/BasemapToggle",
                "esri/widgets/TimeSlider",
                "esri/Graphic",
                "esri/geometry/geometryEngine"
            ], function(esriConfig, WebMap, MapView, BasemapToggle, TimeSlider, Graphic, geometryEngine) {
                esriConfig.portalUrl = gPassedPortalURL;
                esriConfig.apiKey = gPassedAPIkey;

                // ✅ Hardcoded WebMap ID
                const webmap = new WebMap({
                    portalItem: {
                        id: "db3e9b839d7943dfabb14b33c98f00da"
                    }
                });

                gMyWebmap = webmap;

                const view = new MapView({
                    container: that._shadowRoot.getElementById("mapview"),
                    map: webmap
                });

                gView = view; // Store view globally

                const timeSlider = new TimeSlider({
                    container: that._shadowRoot.getElementById("timeSlider"),
                    view: view
                });

                view.when(function () {
                    gWebmapInstantiated = 1;
                    var basemapToggle = new BasemapToggle({
                        view: view,
                        nextBasemap: "satellite"
                    });
                    view.ui.add(basemapToggle, "bottom-right");
                    applyDefinitionQuery();
                });

                view.on("click", function(event) {
                    if (!event.mapPoint) return;
                    const lat = event.mapPoint.latitude;
                    const lon = event.mapPoint.longitude;
                    console.log("Map clicked at lat:", lat, "lon:", lon);
                    const radiusMeters = (Number(gPassedRadiusKm) || 30) * 1000;

                    // Set properties
                    that.lat = lat;
                    that.lon = lon;

                    // Dispatch propertiesChanged to notify SAC
                    that.dispatchEvent(new CustomEvent("propertiesChanged", {
                        detail: {
                            properties: {
                                lat: that.lat,
                                lon: that.lon
                            }
                        }
                    }));

                    // Dispatch the event to trigger SAC script (no detail/parameters)
                    that.dispatchEvent(new CustomEvent("onMapClick", { bubbles: true, composed: true }));
                    console.log("Dispatched onMapClick event");

                    // Draw buffer and marker (unchanged)
                    const buffer = geometryEngine.geodesicBuffer(event.mapPoint, radiusMeters, "meters");
                    view.graphics.removeAll();
                    view.graphics.add(new Graphic({
                        geometry: buffer,
                        symbol: { type: "simple-fill", style: "solid", outline: { width: 1 } }
                    }));
                    view.graphics.add(new Graphic({
                        geometry: event.mapPoint,
                        symbol: { type: "simple-marker", outline: { width: 1 } }
                    }));
                });
            });
        }

        // Getters and setters for properties
        get portalurl() { return this._portalurl; }
        set portalurl(value) { this._portalurl = value; }

        get apikey() { return this._apikey; }
        set apikey(value) { this._apikey = value; }

        get radiuskm() { return this._radiuskm; }
        set radiuskm(value) { this._radiuskm = value; }

        get lat() { return this._lat; }
        set lat(value) { this._lat = value; }

        get lon() { return this._lon; }
        set lon(value) { this._lon = value; }

        static get observedAttributes() {
            return ["portalurl", "apikey", "servicelevel", "radiuskm", "lat", "lon"];
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue !== newValue) {
                this[name] = newValue;
            }
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("radiuskm" in changedProperties) {
                this.radiuskm = changedProperties["radiuskm"];
            }
            gPassedRadiusKm = Number(this.radiuskm) || 30;

            if ("portalurl" in changedProperties) {
                this.portalurl = changedProperties["portalurl"];
            }
            gPassedPortalURL = this.portalurl;

            if ("apikey" in changedProperties) {
                this.apikey = changedProperties["apikey"];
            }
            gPassedAPIkey = this.apikey;

            if (gWebmapInstantiated === 1) {
                applyDefinitionQuery();
            }
        }
    }

    let scriptSrc = "https://js.arcgis.com/4.18/"
    let onScriptLoaded = function() {
        customElements.define("com-sap-custom-geomap", Map);
    }

    let customElementScripts = window.sessionStorage.getItem("customElementScripts") || [];
    let scriptStatus = customElementScripts.find(function(element) {
        return element.src == scriptSrc;
    });

    if (scriptStatus) {
        if(scriptStatus.status == "ready") {
            onScriptLoaded();
        } else {
            scriptStatus.callbacks.push(onScriptLoaded);
        }
    } else {
        let scriptObject = { "src": scriptSrc, "status": "loading", "callbacks": [onScriptLoaded] }
        customElementScripts.push(scriptObject);
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = scriptSrc;
        script.onload = function(){
            scriptObject.status = "ready";
            scriptObject.callbacks.forEach((callbackFn) => callbackFn.call());
        };
        document.head.appendChild(script);
    }
})();
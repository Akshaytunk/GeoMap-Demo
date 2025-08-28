(function() {
    let template = document.createElement("template");
    var gPassedServiceType;
    var gPassedPortalURL;
    var gPassedAPIkey;
    var gWebmapInstantiated = 0;
    var gMyLyr;
    var gMyWebmap;

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
            this.appendChild(template.content.cloneNode(true));
            this._props = {};
            let that = this;

            require([
                "esri/config",
                "esri/WebMap",
                "esri/views/MapView",
                "esri/widgets/BasemapToggle",
                "esri/widgets/TimeSlider",
                "esri/Graphic"
            ], function(esriConfig, WebMap, MapView, BasemapToggle, TimeSlider, Graphic) {
        
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
                    container: "mapview",
                    map: webmap
                });

                const timeSlider = new TimeSlider({
                    container: "timeSlider",
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
            });
        }

        onCustomWidgetBeforeUpdate(changedProperties) {
            this._props = { ...this._props, ...changedProperties };
        }

        onCustomWidgetAfterUpdate(changedProperties) {
            if ("servicelevel" in changedProperties) {
                this.$servicelevel = changedProperties["servicelevel"];
            }
            gPassedServiceType = this.$servicelevel;

            if ("portalurl" in changedProperties) {
                this.$portalurl = changedProperties["portalurl"];
            }
            gPassedPortalURL = this.$portalurl;

            if ("apikey" in changedProperties) {
                this.$apikey = changedProperties["apikey"];
            }
            gPassedAPIkey = this.$apikey;

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

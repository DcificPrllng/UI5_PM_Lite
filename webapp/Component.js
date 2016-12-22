sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"pd/pm/lite/util/formatter",
	"sap/ui/model/odata/v2/ODataModel"
], function(UIComponent, Device, formatter, Omodel) {
	"use strict";

	return UIComponent.extend("pd.pm.lite.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {
			// call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();

			var oModel = new Omodel({
				serviceUrl: "/sap/opu/odata/sap/ZWORKORDER_SRV",
				defaultBindingMode: "OneWay"
					,refreshAfterChange: false
			});

			oModel.setDeferredBatchGroups(["saveAll"]);

			//json Model
			var jsonModel = new sap.ui.model.json.JSONModel();
			this.setModel(jsonModel, "localModel");
			this.setModel(oModel); //We are doing explicit binding here as we need extra serviceUrlParameters
			oModel.setSizeLimit(500); //Units have 250+ entries
		}

	});

});
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History"
], function(Controller, History) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.BaseController", {

		getRouter: function() {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		onNavBack: function(oEvent) {
			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				//window.top.history.go(-1);
				this.getRouter().navTo("appHome", {}, true /*no history*/ );
			} else {
				this.getRouter().navTo("appHome", {}, true /*no history*/ );
			}

		}
	});

});
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"pd/pm/lite/util/formatter"
], function(Controller, History, formatter) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.BaseController", {
		formatter: formatter,
		onInit: function() {
			//Polyfill for IE11
			if (!String.prototype.endsWith) {
				String.prototype.endsWith = function(searchString, position) {
					var subjectString = this.toString();
					if (typeof position !== "number" || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
						position = subjectString.length;
					}
					position -= searchString.length;
					var lastIndex = subjectString.lastIndexOf(searchString, position);
					return lastIndex !== -1 && lastIndex === position;
				};
			}
		},
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
			// ,
			// getEventBus: function(){
			// 	this.eventBus = this.getOwnerComponent().getEventBus();
			// }
	});

});
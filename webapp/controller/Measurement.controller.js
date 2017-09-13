sap.ui.define([
	"pd/pm/lite/controller/BaseController",
	"sap/ui/model/Context",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text"	
], function(Controller, Context, Dialog, Button, Text) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.Measurement", {

		/**
		 * Called when a controller is instantiated and its View controls (if available) are already created.
		 * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
		 * @memberOf pd.pm.lite.view.Measurement
		 */
		onInit: function() {
			//Router
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			this.oView = this.getView();

		},
		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "measurement") {
				return;
			}
			//Set binding context for the view so that relative binding context is set for the table
			var oModel = this.getView().getModel();
			this.getView().setBindingContext(new Context(oModel, "/EntryLists('" + oEvent.getParameter("arguments").entryList + "')"));
		},
		GoHome: function() {
			//Confirm from the user
			var dialog = new Dialog({
				title: "Cancel",
				type: "Message",
				content: new Text({
					text: "You will lose unsaved changes. Continue?"
				}),
				beginButton: new Button({
					text: "Yes",
					press: function() {
						window.location.hash = "#";
						dialog.close();
					}
				}),
				endButton: new Button({
					text: "No",
					press: function() {
						dialog.close();
					}
				}),
				afterClose: function() {
					dialog.destroy();
				}
			});
			dialog.open();
		},		
		SaveMeasurements: function(){
			var measurementTable = this.getView().byId("measurementTable");

		},
		/**
		 * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
		 * (NOT before the first rendering! onInit() is used for that one!).
		 * @memberOf pd.pm.lite.view.Measurement
		 */
		onBeforeRendering: function() {
			//Show the popup for Entry List

		}

		/**
		 * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
		 * This hook is the same one that SAPUI5 controls get after being rendered.
		 * @memberOf pd.pm.lite.view.Measurement
		 */
		//	onAfterRendering: function() {
		//
		//	},

		/**
		 * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
		 * @memberOf pd.pm.lite.view.Measurement
		 */
		//	onExit: function() {
		//
		//	}

	});

});
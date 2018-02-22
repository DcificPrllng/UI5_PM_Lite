sap.ui.define([
	"pd/pm/lite/controller/BaseController",
	"sap/ui/model/Context",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/MessageToast"
], function(Controller, Context, Dialog, Button, Text, MessageToast) {
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
			this._busyDialog = this.getView().byId("MeasurementBusyDialog");
		},
		_onObjectMatched: function(oEvent) {
			var that = this;
			if (oEvent.getParameter("name") !== "measurement") {
				return;
			}
			//Set binding context for the view so that relative binding context is set for the table
			var oModel = this.getView().getModel();
			// this.getView().setBindingContext(new Context(oModel, "/EntryLists('" + oEvent.getParameter("arguments").entryList + "')"));
			that._busyDialog.open();
			oModel.read("/EntryLists('" + oEvent.getParameter("arguments").entryList + "')/MeasurementPoints", {
				success: function(data, response) {
					that._busyDialog.close();
					var currentData = that.getView().getModel("localStorageModel").getData();
					currentData.MeasurementPoints = data.results;
					that.getView().getModel("localStorageModel").setData(currentData);
				},
				error: function(err) {
					that._busyDialog.close();
				}
			});
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
		SaveMeasurements: function() {
			var that = this;
			var callRequired;
			var currentTableContexts = this.getView().byId("measurementTable").getBinding("items").getCurrentContexts();
			var oModel = this.getView().getModel();
			for (var i = 0; i < currentTableContexts.length; i++) {
				var currentObject = currentTableContexts[i].getObject();
				if (currentObject.MeasurementReading !== "" || currentObject.DifferenceFromLastReading !== "") { //If measurement was entered
					oModel.create("/MeasurementDocuments", currentObject, {
						groupId: "saveMeasurements"
					});
					callRequired = true;
				}
			}

			if (callRequired) {
				//Send all measurements
				that._busyDialog.open();
				oModel.submitChanges({
					groupId: "saveMeasurements",
					success: function(context) {
						that._busyDialog.close();
						//Batch  request will always endup here.
						//Check for error again.
						if (context.__batchResponses[0].hasOwnProperty("response")) {
							if (context.__batchResponses[0].response.statusCode === "400") {
								//oModel.resetChanges(); //Data is set back to original. 
								var error = jQuery.parseJSON(context.__batchResponses[0].response.body).error.message.value;
								var dialog = new Dialog({
									title: "Error",
									type: "Message",
									state: "Error",
									content: new sap.m.Text({
										text: error
									}),
									beginButton: new Button({
										text: "OK",
										press: function() {
											dialog.close();
										}
									}),
									afterClose: function() {
										dialog.destroy();
									}
								});
								dialog.open();
							}
						} else {
							window.location.hash = "#";
							var msg = "Success";
							MessageToast.show(msg);
						}
					},
					error: function(error) {
						that._busyDialog.close();
						//Error Handling
						location.reload();
					}
				});
			}
		},
		calculateDifference: function(obj) {
			var boundObject = obj.getSource().getBindingContext("localStorageModel").getObject();
			//Only if difference is not editable,  then calculate the difference
			if (!boundObject.DifferenceEditable) {
				return;
			}
			//Current Reading
			var currentReading = obj.getParameter("value");
			//Previous reading
			var lastReading = boundObject.LastReading;
			//Difference
			var difference = currentReading - lastReading;
			//Difference Control
			var differenceControl = obj.getSource().getParent().getCells()[5];
			differenceControl.setValue(difference);
			if (currentReading === "") {
				differenceControl.setValue("");
			}
		},
		calculateReading: function(obj) {
			var boundObject = obj.getSource().getBindingContext("localStorageModel").getObject();
			var difference = obj.getParameter("value");
			var currentReadingControl = obj.getSource().getParent().getCells()[3];
			var lastReading = boundObject.LastReading;
			var currentReading = parseFloat(lastReading, 10) + parseFloat(difference, 10);
			currentReadingControl.setValue(currentReading);
			if (difference === "") {
				currentReadingControl.setValue("");
			}
		}

	});

});
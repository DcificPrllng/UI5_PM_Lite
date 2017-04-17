sap.ui.define([
	"pd/pm/lite/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/DisplayListItem",
	"sap/m/Dialog",
	"sap/m/Button",
	"sap/m/Text",
	"sap/ui/core/message/Message",
	"sap/ui/core/MessageType",
	"sap/ui/core/ValueState",
	"pd/pm/lite/controller/Validator",
	"pd/pm/lite/customTypes/Operation",
	"pd/pm/lite/customTypes/Number",
	"pd/pm/lite/customTypes/Mandatory",
	"pd/pm/lite/customTypes/MandatoryDate",	
	"pd/pm/lite/customTypes/ItemNumber",
	"pd/pm/lite/customTypes/ComponentId"
], function(Controller, JSONModel, MessageToast, DisplayListItem, Dialog, Button, Text, Message, MessageType, ValueState,
	Validator) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.NewOrder", {
		onInit: function() {
			//Router
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			this.oModel = this.getOwnerComponent().getModel();
			this.oView = this.getView();
			this._busyDialog = this.getView().byId("ChangeBusyDialog");
			this._WorkCenterDialog = this.getView().byId("idWorkCenterDialog");
			this._ComponentDialog = this.getView().byId("idComponentDialog");
			this._workCenterDialogList = this.getView().byId("idWorkCenterDialogList");
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();

			// var standardListItem = new DisplayListItem({
			// 	label: "{Id}",
			// 	value: "{Name}"
			// });

			// //Bind components and work centers value help
			// var userPlant = this.oModel.getData("/UserSettings('dummy')").Plant;
			// var oFilter1 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, userPlant);

			// // //Get work centers from browsers' local db
			// // this._workCenterDialogList.bindAggregation("items", {
			// // 	path: "/WorkCenters",
			// // 	template: standardListItem,
			// // 	filters: [oFilter1]
			// // });

			//THis model will be used for sending all the data
			this.createModel = new JSONModel();
			this.getView().setModel(this.createModel, "createModel");

			this.createModel.setData({
				"WorkOrderDetail": {
					FunctionalLocation: "",
					FunctionalLocationName: "",
					Equipment: "",
					EquipmentName: "",
					Operations: [],
					Components: []
				}
			});
			var step;
			for (step = 0; step < 1; step++) {
				this.createNewRowComponents();
				this.createNewRowOperations();
			}
		},

		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "newOrder") {
				return;
			}
			//Parameters
			var parameters = oEvent.getParameter("arguments");

			//Read DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes
			var oView = this.getView();
			var sPath = "/ValueHelpSet(FunctionalLocation='" + parameters.functionalLocation + "',Equipment='" + parameters.equipmentNumber +
				"')";
			var oParameters = {
				urlParameters: {
					"$expand": "DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes"
				},
				success: function() {
					oView.setBusy(false);
					oView.bindElement({
						path: sPath
					});
				},
				error: function() {
					oView.setBusy(false);
					window.location.hash = "#"; //Error. Go back to home screen
				}
			};
			oView.setBusy(true);
			oView.getModel().read(sPath, oParameters);

			this.createModel.setProperty("/WorkOrderDetail/FunctionalLocation", parameters.functionalLocation);
			this.createModel.setProperty("/WorkOrderDetail/FunctionalLocationName", parameters.functionalLocationName);
			if (parameters.equipmentName !== "XX") {  //It is a dummy number
				this.createModel.setProperty("/WorkOrderDetail/Equipment", parameters.equipment);
				this.createModel.setProperty("/WorkOrderDetail/EquipmentName", parameters.equipmentName);
			}
		},
		getComponentDetail: function(evt) {
			var enteredComponent = evt.getParameter("newValue");
			var oView = this.getView();
			var that = this;
			var row = evt.getSource().getParent();
			var control = evt.getSource();
			//Call the function import to get component detail
			var model = this.getOwnerComponent().getModel();
			oView.setBusy(true);

			model.callFunction("/GetComponentDetail", {
				method: "GET",
				urlParameters: {
					"ComponentNumber": enteredComponent
				},
				success: function(oData) {
					//Set the value to the right column item
					oView.setBusy(false);
					sap.ui.getCore().getMessageManager().removeAllMessages();
					row.getCells()[1].setValue(that.formatter.removeLeadingZerosFromString(oData.Id));
					row.getCells()[2].setText(oData.Name); //Component's description
					row.getCells()[4].setSelectedKey(oData.UoM); //Component's UoM				
				},
				error: function() {
					oView.setBusy(false);
					that.oMessageManager.addMessages(
						new Message({
							message: that.oMessageManager.getMessageModel().getData()[0].message,
							type: MessageType.Error,
							target: control.getId(),
							processor: that.oMessageProcessor,
							validation: true
						})
					);
					row.getCells()[1].setValue("");
					row.getCells()[2].setText(""); //Component's description
					row.getCells()[4].setSelectedKey(""); //Component's UoM						
				}
			});
		},
		createNewRowOperations: function() {
			var currentOperations = this.getView().getModel("createModel").getProperty("/WorkOrderDetail/Operations");

			//Find the larget OperationID
			var maxOperationId = this.getMax(currentOperations, "OperationID");
			maxOperationId = maxOperationId + 10;

			//Four digit id
			var newOperationId = this.pad(maxOperationId, 4);

			currentOperations.push({
				"ActualWork": "",
				"OperationID": newOperationId,
				"OrderNumber": "",
				"ShortText": "",
				"WorkCenter": "",
				"WorkQuantity": "",
				"WorkUnit": "",
				"New": true
			});
			this.getView().getModel("createModel").setProperty("/WorkOrderDetail/Operations", currentOperations);
		},
		createNewRowComponents: function() {
			var currentComponents = this.getView().getModel("createModel").getProperty("/WorkOrderDetail/Components");
			//Find the larget ItemId
			var maxItemId = this.getMax(currentComponents, "ItemID");
			maxItemId = maxItemId + 10;

			//Four digit id
			var newItemId = this.pad(maxItemId, 4);
			currentComponents.push({
				"ComponentNumber": "",
				"ItemID": newItemId,
				"OrderNumber": "",
				"Description": "",
				"RequirementQuantity": "",
				"Unit": "",
				"ItemCategory": "",
				"OperationReference": "",
				"New": true
			});
			this.getView().getModel("createModel").setProperty("/WorkOrderDetail/Components", currentComponents);
		},
		getMax: function(arr, prop) {
			var max;
			if (arr.length === 0) {
				return 0;
			}
			for (var i = 0; i < arr.length; i++) {
				if (!max || parseInt(arr[i][prop]) > parseInt(max[prop])) {
					max = arr[i];
				}
			}
			return parseInt(max[prop]);
		},
		pad: function(num, size) {
			var s = "000000000" + num;
			return s.substr(s.length - size);
		},
		getValidDamageCodes: function(oEvent) {
			// var selectedKey = oEvent.getParameter("selectedItem").getKey();
		},
		getValidCauseCodes: function(oEvent) {
			// var selectedKey = oEvent.getParameter("selectedItem").getKey();
		},
		deleteSelectedComponents: function() {
			var that = this;

			//Get Table reference
			var componentTable = this.getView().byId("ComponentsTable");

			//Get selected rows
			var deletedRows = componentTable.getSelectedIndices();
			deletedRows.map(function(c) {
				//current context/Object
				var d = componentTable.getContextByIndex(c).getObject();

				//Delete them from json model.
				var currentComponents = that.getView().getModel("jsonModel").getProperty("/Components");
				that.findAndRemove(currentComponents, "ItemID", d.ItemID);
				that.getView().getModel("jsonModel").setProperty("/Components", currentComponents);
				if (d.New !== "X") { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Components(OrderNumber='" + d.OrderNumber + "',ItemID='" + d.ItemID + "')", {
						groupId: "saveAll"
					});
				}
			});
		},
		deleteSelectedOperations: function() {
			var that = this;

			//Get Table reference
			var operationTable = this.getView().byId("OperationsTable");

			//Get selected rows
			var deletedRows = operationTable.getSelectedIndices();
			deletedRows.map(function(c) {
				//current context/Object
				var d = operationTable.getContextByIndex(c).getObject();

				//Delete them from json model.
				var currentOperations = that.getView().getModel("jsonModel").getProperty("/Operations");
				that.findAndRemove(currentOperations, "OperationID", d.OperationID);
				that.getView().getModel("jsonModel").setProperty("/Operations", currentOperations);
				if (d.New !== "X") { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Operations(OrderNumber='" + d.OrderNumber + "',OperationID='" + d.OperationID + "')", {
						groupId: "saveAll"
					});
				}
			});
		},
		findAndRemove: function(array, property, value) {
			array.forEach(function(result, index) {
				if (result[property] === value) {
					//Remove from array
					array.splice(index, 1);
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
		ReleaseOrder: function() {
			//Call function to release the order
			var workOrderDetails = this.getView().getModel("jsonModel").oData;
			var oModel = this.getView().getModel();

			this._busyDialog.open();
			var that = this;
			oModel.callFunction("/ReleaseOrder", {
				method: "POST",
				urlParameters: {
					"OrderNumber": workOrderDetails.WorkOrderDetail.OrderNumber
				},
				success: function() {
					that._busyDialog.close();
					var msg = "Successfully released the order";
					MessageToast.show(msg);
					window.location.hash = "#";
				},
				error: function(oError) {
					that._busyDialog.close();
					var popUp = new Dialog({
						title: "Error",
						type: "Message",
						state: "Error",
						content: new sap.m.Text({
							text: JSON.parse(oError.responseText).error.message.value
						}),
						beginButton: new sap.m.Button({
							text: "OK",
							press: function() {
								popUp.close();
							}
						}),
						afterClose: function() {
							popUp.destroy();
						}
					});
					popUp.open();
				}
			});
		},
		SaveOrder: function() {
			var validator = new Validator();

			if (!validator.validate(this.getView())) {
				return;
			}

			//Get Operations and components.
			var workOrderDetails = this.getView().getModel("createModel").oData;
		},
		OnWorkCenterSelected: function(evt) {
			var selectedWorkCenter = evt.getSource().getSelectedItem().getLabel();
			var workCenterDialog = evt.getSource().getParent();
			//Set the value to the right column item
			workCenterDialog.data("source").setValue(selectedWorkCenter);
			workCenterDialog.close();
		},
		showWorkCenterValueHelp: function(oEvent) {
			var WorkCenterDialog = this.getView().getController()._WorkCenterDialog;
			this.getView().getController()._workCenterDialogList.removeSelections();
			WorkCenterDialog.data("source", oEvent.getSource());
			WorkCenterDialog.open();
		},
		OnComponentSelected: function(evt) {
			var selectedComponent = evt.getParameter("selectedItem").getBindingContext().getObject();
			//Set the value to the right column item
			this.getView().getController()._ComponentDialog.data("source").setValue(this.formatter.removeLeadingZerosFromString(
				selectedComponent.Id));
			var row = this.getView().getController()._ComponentDialog.data("source").getParent();
			row.getCells()[2].setText(selectedComponent.Name); //Component's description
			row.getCells()[4].setSelectedKey(selectedComponent.UoM); //Component's UoM
		},
		showComponentValueHelp: function(oEvent) {
			var ComponentDialog = this.getView().getController()._ComponentDialog;
			ComponentDialog.data("source", oEvent.getSource());

			//Clear current entries
			ComponentDialog.removeAllItems();

			this.getView().getController()._ComponentDialog.open();
		},
		OnComponentSearch: function(oEvent) {
			//Get the search item
			var searchTerm = oEvent.getParameter("value");

			var model = this.getOwnerComponent().getModel();

			//Bind components and work centers value help
			var userPlant = model.getData("/UserSettings('dummy')").Plant;
			var oFilter1 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, userPlant);

			//Bind items
			var oTemplate = new sap.m.ColumnListItem({
				cells: [
					new sap.m.Text().bindText({
						path: "Id",
						formatter: this.formatter.removeLeadingZerosFromString
					}),
					new sap.m.Text({
						text: "{Name}"
					}),
					new sap.m.Text({
						text: "{MPN}"
					}),
					new sap.m.Text({
						text: "{Manufacturer}"
					})
				]
			});

			this._ComponentDialog.bindAggregation("items", {
				path: "/NewComponents",
				template: oTemplate,
				filters: [oFilter1],
				parameters: {
					custom: {
						search: searchTerm
					}
				}
			});
		}
	});

});
sap.ui.define([
	"pd/pm/lite/controller/BaseController",
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
	"pd/pm/lite/customTypes/ItemNumber",
	"pd/pm/lite/customTypes/ComponentId"
], function(Controller, MessageToast, DisplayListItem, Dialog, Button, Text, Message, MessageType, ValueState, Validator) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.ConfirmOrder", {
		onInit: function() {
			//Router
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			// var model = this.getOwnerComponent().getModel();
			this.oView = this.getView();

			//All dialogs
			this._busyDialog = this.getView().byId("ChangeBusyDialog");
			this._WorkCenterDialog = this.getView().byId("idWorkCenterDialog");
			this._workCenterDialogList = this.getView().byId("idWorkCenterDialogList");

			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
		},

		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "confirmOrder") {
				return;
			}

			//Make data call
			var oView = this.getView();
			var sPath = "/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')";
			var parameters = {
				urlParameters: {
					// "$expand": "Components,Operations,DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes,Units"
					"$expand": "Confirmations,OperationSteps,DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes"
				},
				success: function(odata) {
					oView.setBusy(false);
					oView.bindElement({
						path: sPath
					});

					var userStatuses = oView.getModel("localStorageModel").getData().UserStatuses;
					for (var j = 0; j < userStatuses.length; j++) {
						if (userStatuses[j].Key === odata.OrderType) {
							var UserStatusesWithNumber = userStatuses[j].UserStatusesWithNumber.results;
							var UserStatusesNoNumber = userStatuses[j].UserStatusesNoNumber.results;
							break;
						}
					}

					//Keep only relevant activity types
					var relevantActivityTypes = [];
					var activityTypes = [];
					activityTypes = oView.getModel("localStorageModel").getData().ActivityTypes;
					if (activityTypes) {
						for (var k = 0; k < activityTypes.length; k++) {
							if (activityTypes[k].OrderType === odata.OrderType) {
								relevantActivityTypes.push(activityTypes[k]);
							}
						}
					}

					var jsonModel = new sap.ui.model.json.JSONModel();
					jsonModel.setData({
						WorkOrderDetail: odata,
						ActivityTypes: relevantActivityTypes,
						Confirmations: odata.Confirmations.results,
						OperationSteps: odata.OperationSteps.results
					});
					oView.setModel(jsonModel, "confirmModel");
				},
				error: function() {
					oView.setBusy(false);
					window.location.hash = "#"; //Error. Go back to home screen
				}
			};
			oView.setBusy(true);
			if (oView.getModel()) {
				oView.getModel().read("/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')", parameters);
			} else {
				oView.setBusy(false);
				window.location.hash = "#";
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
					row.getCells()[4].setText(oData.UoM); //Component's UoM				
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
				if (!d.New) { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Components(OrderNumber='" + d.OrderNumber + "',ItemID='" + d.ItemID + "')", {
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
		SaveOrder: function() {

			var validator = new Validator();
			//Get Operations and components.
			var workOrderDetails = this.getView().getModel("jsonModel").oData;
			var operations = workOrderDetails.Operations;
			var components = workOrderDetails.Components;

			//Remove empty components
			var newComponents = [];

			for (var i = 0; i < components.length; i++) {
				//If one of these fields are not null, only then retian the record
				if (components[i].Description || components[i].RequirementQuantity) {
					newComponents.push(components[i]);
				}
			}

			//Update the Components
			this.getView().getModel("jsonModel").setProperty("/Components", newComponents);

			//Remove Empty Operations
			var newOperations = [];
			if (operations.length > 1) { //One Operation is mandatory
				for (i = 0; i < operations.length; i++) {
					//If one of these fields are not null, only then retian the record
					if (operations[i].ShortText || operations[i].WorkQuantity) {
						newOperations.push(operations[i]);
					}
				}
				if (newOperations.length === 0) {
					newOperations.push(operations[0]);
				}

				//Update the Operations
				this.getView().getModel("jsonModel").setProperty("/Operations", newOperations);
			}

			if (!validator.validate(this.getView())) {
				return;
			}

			var currentWorkOrderDetail = {};
			currentWorkOrderDetail.NotificationNumber = workOrderDetails.WorkOrderDetail.NotificationNumber;
			currentWorkOrderDetail.Equipment = workOrderDetails.WorkOrderDetail.Equipment;
			currentWorkOrderDetail.FunctionalLocation = workOrderDetails.WorkOrderDetail.FunctionalLocation;
			currentWorkOrderDetail.MainWorkCenter = workOrderDetails.WorkOrderDetail.MainWorkCenter;
			currentWorkOrderDetail.NotificationCode = workOrderDetails.WorkOrderDetail.NotificationCode;
			currentWorkOrderDetail.NotificationLongText = workOrderDetails.WorkOrderDetail.NotificationLongText;
			currentWorkOrderDetail.OrderNumber = workOrderDetails.WorkOrderDetail.OrderNumber;
			currentWorkOrderDetail.PmActivityType = workOrderDetails.WorkOrderDetail.PmActivityType;

			currentWorkOrderDetail.ScheduledFinish = workOrderDetails.WorkOrderDetail.ScheduledFinish;
			currentWorkOrderDetail.ShortDescription = workOrderDetails.WorkOrderDetail.ShortDescription;

			currentWorkOrderDetail.SystemStatus = "";
			currentWorkOrderDetail.UserStatus = workOrderDetails.WorkOrderDetail.UserStatus;
			currentWorkOrderDetail.Cause = workOrderDetails.WorkOrderDetail.Cause;
			currentWorkOrderDetail.Damage = workOrderDetails.WorkOrderDetail.Damage;
			currentWorkOrderDetail.BasicStart = workOrderDetails.WorkOrderDetail.ScheduledFinish;
			currentWorkOrderDetail.BasicFinish = workOrderDetails.WorkOrderDetail.ScheduledFinish;
			currentWorkOrderDetail.NotificationCode = workOrderDetails.WorkOrderDetail.NotificationCode;
			currentWorkOrderDetail.NewNote = workOrderDetails.WorkOrderDetail.NewNote;

			//Calculate changes and make approriate actions on Odata model
			this.getView().getModel().update("/WorkOrderDetailSet('" + workOrderDetails.WorkOrderDetail.OrderNumber + "')",
				currentWorkOrderDetail, {
					groupId: "saveAll"
				});

			for (var i = 0; i < operations.length; i++) {
				var operationEntry = {};
				operationEntry.ActualWork = operations[i].ActualWork === "" ? "0" : operations[i].ActualWor;
				operationEntry.OperationID = operations[i].OperationID;
				operationEntry.OrderNumber = operations[i].OrderNumber;
				operationEntry.ShortText = operations[i].ShortText;
				operationEntry.WorkCenter = operations[i].WorkCenter;
				operationEntry.WorkQuantity = operations[i].WorkQuantity;
				operationEntry.WorkUnit = operations[i].WorkUnit;

				if (operations[i].New) {
					this.getView().getModel().create("/Operations", operationEntry, {
						groupId: "saveAll"
					});
				} else {
					this.getView().getModel().update("/Operations(OrderNumber='" + operations[i].OrderNumber + "',OperationID='" + operations[i].OperationID +
						"')", operationEntry, {
							groupId: "saveAll"
						});
				}
			}

			for (i = 0; i < components.length; i++) {
				var componentEntry = {};
				componentEntry.OrderNumber = components[i].OrderNumber;
				componentEntry.ItemID = components[i].ItemID;
				componentEntry.ComponentNumber = components[i].ComponentNumber;
				componentEntry.Description = components[i].Description;
				componentEntry.RequirementQuantity = components[i].RequirementQuantity;
				componentEntry.Unit = components[i].Unit;
				componentEntry.ItemCategory = components[i].ItemCategory;
				componentEntry.OperationReference = components[i].OperationReference;

				if (components[i].New) {
					this.getView().getModel().create("/Components", componentEntry, {
						groupId: "saveAll"
					});
				} else {
					this.getView().getModel().update("/Components(OrderNumber='" + components[i].OrderNumber + "',ItemID='" + components[i].ItemID +
						"')", componentEntry, {
							groupId: "saveAll"
						});
				}
			}
			//Check if there is a new Notification
			this._busyDialog.open();
			var that = this;
			this.getView().getModel().submitChanges({
				groupId: "saveAll",
				success: function(context) {
					that._busyDialog.close();
					//Batch  request will always endup here.
					//Check for error again.
					if (context.__batchResponses[0].hasOwnProperty("response")) {
						if (context.__batchResponses[0].response.statusCode === "400") {
							//oModel.resetChanges(); //Data is set back to original. 
							var error = jQuery.parseJSON(context.__batchResponses[0].response.body).error.message.value;
							var dialog = new sap.m.Dialog({
								title: "Error",
								type: "Message",
								state: "Error",
								content: new sap.m.Text({
									text: error
								}),
								beginButton: new sap.m.Button({
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
						var msg = "Successfully updated the order";
						MessageToast.show(msg);
						window.location.hash = "#";
					}
				},
				error: function() {
					that._busyDialog.close();
					//Error Handling

				}
			});
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
			row.getCells()[4].setText(selectedComponent.UoM); //Component's UoM
		},
		showComponentValueHelp: function(oEvent) {
			var ComponentDialog = this.getView().getController()._ComponentDialog;
			ComponentDialog.data("source", oEvent.getSource());

			//Clear current entries
			ComponentDialog.removeAllItems();

			this.getView().getController()._ComponentDialog.open();
		},
		_handleCValueHelpClose: function(oEvent) {
			oEvent.getSource().getParent().close();
		},
		showUserStatusValueHelp: function() {

			var oView = this.getView();
			var sPath = "/UserStatusValueHelp('" + this.getView().getModel("jsonModel").getData("/WorkOrderDetail").WorkOrderDetail.OrderNumber +
				"')";

			oView.getController()._userStatusDialog.unbindElement();
			oView.getController()._userStatusDialog.bindElement(sPath, {
				"expand": "UserStatusesNoNumber,UserStatusesWithNumber"
			});

			oView.getController()._userStatusDialog.open();

			//Marking current status on the popup
			var currentStatus = this.getView().getModel("jsonModel").getProperty("/WorkOrderDetail").UserStatus;
			var allStatuses = [];
			allStatuses = currentStatus.split(" ");

			var UserStatusesWithNumber = this.getView().getModel("jsonModel").getProperty("/UserStatusesWithNumber");
			var UserStatusesNoNumber = this.getView().getModel("jsonModel").getProperty("/UserStatusesNoNumber");

			//Selecting in the first table
			for (var i = 0; i < UserStatusesWithNumber.length; i++) {
				if ((UserStatusesWithNumber[i].Status + "      ").substring(0, 4) === (currentStatus + "      ").substring(0, 4)) {
					oView.getController()._userStatusDialog.getContent()[0].setSelectedIndex(i);
					break;
				}
			}

			//Selecting in the second table
			for (var j = 0; j < allStatuses.length; j++) {
				for (var m = 0; m < UserStatusesNoNumber.length; m++) {
					if ((UserStatusesNoNumber[m].Status + "      ").substring(0, 4) === (allStatuses[j] + "      ").substring(0, 4)) {
						oView.getController()._userStatusDialog.getContent()[1].setSelectedIndex(m);
						break;
					}
				}
			}
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
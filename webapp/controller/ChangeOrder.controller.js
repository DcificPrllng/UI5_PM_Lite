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
], function(Controller, MessageToast, DisplayListItem, Dialog, Button, Text, Message, MessageType, ValueState,
	Validator) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.ChangeOrder", {
		onInit: function() {
			//Router
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			this.oView = this.getView();

			//All dialogs
			this._busyDialog = this.getView().byId("ChangeBusyDialog");
			this._WorkCenterDialog = this.getView().byId("idWorkCenterDialog");
			// this._ComponentDialog = this.getView().byId("idComponentDialog");
			this._ComponentDialog = this.getView().byId("idMaterialDialog");
			// this._ComponentDialog._oSearchField.setPlaceholder("Search by any column");
			this._workCenterDialogList = this.getView().byId("idWorkCenterDialogList");
			this._userStatusDialog = this.getView().byId("userStatusDialog");
			//Dialog for attachment
			this._attachmentDialog = this.getView().byId("attachmentDialog");
			//Dialog for Part Status
			this._partStatusDialog = this.getView().byId("idPartStatusDialog");

			//Error Handling
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();

			//Tab handling for table
			//var oTable = this.getView().byId("OperationsTable");
			//this.setupTabHandling(oTable);
			//Single select to componet valuehelp
			var oTable = this.getView().byId("smartTable_ResponsiveTable").getTable();
			oTable.setMode("SingleSelectLeft");
			oTable.setProperty("includeItemInSelection", true);
			oTable.setProperty("growingThreshold", 30);
			oTable.setProperty("fixedLayout", false);
			oTable.setRememberSelections(false);
		},
		onAfterRendering: function() {},
		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "changeOrder") {
				return;
			}
			//Make data call
			var oView = this.getView();
			var that = this;
			var sPath = "/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')";
			var parameters = {
				urlParameters: {
					"$expand": "Components,Operations,DamageCodeGroups/DamageCodes,CauseCodeGroups/CauseCodes,NotificationCodes,OrderAttachments,NotificationAttachments"
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
							UserStatusesNoNumber.sort(function(a, b) {
								return a.Status.localeCompare(b.Status);
							}); //Sort by Status
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
						Components: odata.Components.results,
						Operations: odata.Operations.results,
						WorkOrderDetail: odata,
						UserStatusesWithNumber: UserStatusesWithNumber,
						UserStatusesNoNumber: UserStatusesNoNumber,
						ActivityTypes: relevantActivityTypes,
						OrderAttachments: odata.OrderAttachments.results,
						NotificationAttachments: odata.NotificationAttachments.results
					});
					oView.setModel(jsonModel, "jsonModel");
					var step;
					// var emptyComponents = 9 - odata.Components.results.length;
					var emptyComponents = 5 - odata.Components.results.length;
					for (step = 0; step < emptyComponents; step++) {
						that.createNewRowComponents();
					}
					// var emptyOperations = 9 - odata.Operations.results.length;
					var emptyOperations = 5 - odata.Operations.results.length;
					for (step = 0; step < emptyOperations; step++) {
						that.createNewRowOperations();
					}
				},
				error: function() {
					oView.setBusy(false);
					window.location.hash = "#"; //Error. Go back to home screen
				}
			};
			oView.setBusy(true);
			if (oView.getModel()) { //When navigated ot this view directly, there is no context. SO go back to the main screen
				oView.getModel().read("/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')", parameters);
			} else {
				oView.setBusy(false);
				window.location.hash = "#";
			}
		},
		ShowAvailabilityStatus: function() {
			this._partStatusDialog.open();
		},
		CalculateUserStatus: function(evt) {
			var source = evt.getSource();
			var newStatus = "";
			if (source.getId().indexOf("UserStatusesWithNumber") >= 0) {
				//This is single selection: WithNumber
				var selectedIndex = source.getSelectedIndex();
				var selectedContext = source.getContextByIndex(selectedIndex);
				//Update the Status
				var currenctStatus = this.oView.getModel("jsonModel").getProperty("/WorkOrderDetail/UserStatus");
				var newWithNumberStatus = (selectedContext.getObject().Status + "     ").substring(0, 5);
				newStatus = newWithNumberStatus + currenctStatus.substring(5);
				this.oView.getModel("jsonModel").setProperty("/WorkOrderDetail/UserStatus", newStatus);
				//Show a information that if the new status is 'Ready for Release' (OK), then order needs to be saved before releasing the order
				if (newStatus.startsWith("OK") && !currenctStatus.startsWith("OK")) {
					var dialog = new Dialog({
						title: "Information",
						type: "Message",
						content: new Text({
							text: "You have selected the order status as 'Ready for Release'(OK). You need to save the order before you can release it."
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
				var selectedIndices = source.getSelectedIndices();
				var curStatus = this.oView.getModel("jsonModel").getProperty("/WorkOrderDetail/UserStatus");
				newStatus = (curStatus + "     ").substring(0, 5);
				for (var i = 0; i < selectedIndices.length; i++) {
					var selectedContxt = source.getContextByIndex(selectedIndices[i]);
					newStatus = newStatus + (selectedContxt.getObject().Status + "     ").substring(0, 5);
				}
				//Update the status to the model
				this.oView.getModel("jsonModel").setProperty("/WorkOrderDetail/UserStatus", newStatus);
			}
		},
		validateDates: function(evt) {
			var form = evt.getSource().getParent().getParent();
			var formContent = form.getFormElements();
			var startDateComponent = formContent[0].getFields()[0];
			var endDateComponent = formContent[1].getFields()[0];

			//If one of them is initial, return
			if (!startDateComponent.getDateValue() || !endDateComponent.getDateValue()) {
				return;
			}
			if (startDateComponent.getDateValue() > endDateComponent.getDateValue()) {
				//Error
				startDateComponent.setValueState("Error").setValueStateText("Start date cannot be later than End Date");
				endDateComponent.setValueState("Error").setValueStateText("Start date cannot be later than End Date");
			} else {
				//Clear Error
				startDateComponent.setValueState("None");
				endDateComponent.setValueState("None");
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
		createNewRowOperations: function() {
			var currentOperations = this.getView().getModel("jsonModel").getProperty("/Operations");

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
			this.getView().getModel("jsonModel").setProperty("/Operations", currentOperations);
		},
		createNewRowComponents: function() {
			var currentComponents = this.getView().getModel("jsonModel").getProperty("/Components");
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
			this.getView().getModel("jsonModel").setProperty("/Components", currentComponents);
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
			var currentPath = oEvent.getSource().getSelectedItem().getBindingContext().getPath();
			var codePath = currentPath + "/DamageCodes";

			//get instance of damage code control
			var damageControl = oEvent.getSource().getParent().getFields()[1];
			damageControl.bindItems(codePath, new sap.ui.core.ListItem({
				key: "{Code}",
				text: "{Code}",
				additionalText: "{Name}"
			}));
		},
		getValidCauseCodes: function(oEvent) {
			var currentPath = oEvent.getSource().getSelectedItem().getBindingContext().getPath();
			var codePath = currentPath + "/CauseCodes";

			//get instance of damage code control
			var causeControl = oEvent.getSource().getParent().getFields()[1];
			causeControl.bindItems(codePath, new sap.ui.core.ListItem({
				key: "{Code}",
				text: "{Code}",
				additionalText: "{Name}"
			}));
		},
		deleteSelectedComponents: function() {
			var that = this;

			//Get Table reference
			var componentTable = this.getView().byId("ComponentsTable");

			//Get selected rows
			var deletedRows = componentTable.getSelectedIndices();
			var currentComponentsRef = that.getView().getModel("jsonModel").getProperty("/Components");
			var currentComponents = currentComponentsRef.slice();
			deletedRows.map(function(c) {
				//current context/Object
				var d = componentTable.getContextByIndex(c).getObject();

				//Delete them from json model.
				that.findAndRemove(currentComponents, "ItemID", d.ItemID);
				if (!d.New) { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Components(OrderNumber='" + d.OrderNumber + "',ItemID='" + d.ItemID + "')", {
						groupId: "saveAll"
					});
				}
			});
			that.getView().getModel("jsonModel").setProperty("/Components", currentComponents);
			componentTable.clearSelection();
		},
		deleteSelectedOperations: function() {
			var that = this;

			//Get Table reference
			var operationTable = this.getView().byId("OperationsTable");

			//Get selected rows
			var deletedRows = operationTable.getSelectedIndices();
			var currentOperationsRef = that.getView().getModel("jsonModel").getProperty("/Operations");
			var currentOperations = currentOperationsRef.slice();
			deletedRows.map(function(c) {
				//current context/Object
				var d = operationTable.getContextByIndex(c).getObject();
				//Delete them from json model.
				that.findAndRemove(currentOperations, "OperationID", d.OperationID);
				if (!d.New) { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Operations(OrderNumber='" + d.OrderNumber + "',OperationID='" + d.OperationID + "')", {
						groupId: "saveAll"
					});
				}
			});
			that.getView().getModel("jsonModel").setProperty("/Operations", currentOperations);
			operationTable.clearSelection();
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
		// ReleaseOrder: function() {
		// 	this.getView().getModel("jsonModel").setProperty("/WorkOrderDetail/Release", true);

		// 	var dialog = new Dialog({
		// 		title: "Info",
		// 		type: "Message",
		// 		content: new Text({
		// 			text: "Order has been marked for Release. Please save to release it."
		// 		}),
		// 		endButton: new Button({
		// 			text: "OK",
		// 			press: function() {
		// 				dialog.close();
		// 			}
		// 		}),
		// 		afterClose: function() {
		// 			dialog.destroy();
		// 		}
		// 	});
		// 	dialog.open();

		// 	// this.updateOrder();
		// 	// this.submitUpdates();
		// },
		closeDialog: function(){
			this._partStatusDialog.close();
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
					"OrderNumber": workOrderDetails.WorkOrderDetail.OrderNumber,
					"TestRun": true
				},
				success: function() {
					that._busyDialog.close();
					// var msg = "Successfully released the order";
					// MessageToast.show(msg);
					// window.location.hash = "#";
					that.getView().getModel("jsonModel").setProperty("/WorkOrderDetail/Release", true);

					var dialog = new Dialog({
						title: "Info",
						type: "Message",
						content: new Text({
							text: "Order has been marked for Release. Please save to release it."
						}),
						endButton: new Button({
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
				},
				error: function(oError) {
					that._busyDialog.close();
					try {
						var errorMessage = JSON.parse(oError.responseText).error.message.value; //JSON error
					} catch (err) {
						errorMessage = $(oError.responseText).find("message").first().text(); //XML error
					}
					var popUp = new Dialog({
						title: "Error",
						type: "Message",
						state: "Error",
						content: new sap.m.Text({
							text: errorMessage
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
		updateNotificationGroup: function(evt) {
			this.getView().getModel("jsonModel").setProperty("/WorkOrderDetail/NotificationCodeGroup", evt.getSource().getSelectedItem().getBindingContext()
				.getObject().Group);
		},
		SaveOrder: function() {
			this.updateOrder();

			var validator = new Validator();
			if (!validator.validate(this.getView())) {
				return;
			}

			this.submitUpdates();
		},
		updateOrder: function() {
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

			//Rerender view
			this.getView().rerender();

			if (!validator.validate(this.getView())) {
				return;
			}

			workOrderDetails = this.getView().getModel("jsonModel").oData;
			operations = workOrderDetails.Operations;
			components = workOrderDetails.Components;

			var currentWorkOrderDetail = {};
			currentWorkOrderDetail.NotificationNumber = workOrderDetails.WorkOrderDetail.NotificationNumber;
			currentWorkOrderDetail.Equipment = workOrderDetails.WorkOrderDetail.Equipment;
			currentWorkOrderDetail.FunctionalLocation = workOrderDetails.WorkOrderDetail.FunctionalLocation;
			currentWorkOrderDetail.MainWorkCenter = workOrderDetails.WorkOrderDetail.MainWorkCenter;
			currentWorkOrderDetail.OrderNumber = workOrderDetails.WorkOrderDetail.OrderNumber;
			currentWorkOrderDetail.PmActivityType = workOrderDetails.WorkOrderDetail.PmActivityType;

			currentWorkOrderDetail.ScheduledFinish = workOrderDetails.WorkOrderDetail.ScheduledFinish;
			currentWorkOrderDetail.ShortDescription = workOrderDetails.WorkOrderDetail.ShortDescription;

			currentWorkOrderDetail.SystemStatus = "";
			currentWorkOrderDetail.UserStatus = workOrderDetails.WorkOrderDetail.UserStatus;
			currentWorkOrderDetail.Cause = workOrderDetails.WorkOrderDetail.Cause;
			currentWorkOrderDetail.Damage = workOrderDetails.WorkOrderDetail.Damage;

			currentWorkOrderDetail.BasicStart = workOrderDetails.WorkOrderDetail.BasicStart;
			currentWorkOrderDetail.BasicFinish = workOrderDetails.WorkOrderDetail.BasicFinish;

			currentWorkOrderDetail.NotificationCodeGroup = workOrderDetails.WorkOrderDetail.NotificationCodeGroup;
			currentWorkOrderDetail.NotificationCode = workOrderDetails.WorkOrderDetail.NotificationCode;
			currentWorkOrderDetail.NotificationLongText = workOrderDetails.WorkOrderDetail.NotificationLongText;
			currentWorkOrderDetail.NewNote = workOrderDetails.WorkOrderDetail.NewNote;

			currentWorkOrderDetail.OperationDowntime = workOrderDetails.WorkOrderDetail.OperationDowntime;
			currentWorkOrderDetail.DowntimeStart = workOrderDetails.WorkOrderDetail.DowntimeStart;
			currentWorkOrderDetail.DowntimeEnd = workOrderDetails.WorkOrderDetail.DowntimeEnd;

			currentWorkOrderDetail.Breakdown = workOrderDetails.WorkOrderDetail.Breakdown;
			currentWorkOrderDetail.BreakdownStart = workOrderDetails.WorkOrderDetail.BreakdownStart;
			currentWorkOrderDetail.BreakdownFinish = workOrderDetails.WorkOrderDetail.BreakdownFinish;

			currentWorkOrderDetail.Release = workOrderDetails.WorkOrderDetail.Release;
			//Calculate changes and make approriate actions on Odata model
			this.getView().getModel().update("/WorkOrderDetailSet('" + workOrderDetails.WorkOrderDetail.OrderNumber + "')",
				currentWorkOrderDetail, {
					groupId: "saveAll"
				});

			for (i = 0; i < operations.length; i++) {
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
		},
		submitUpdates: function() {
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
		// OnComponentSelected: function(evt) {
		// 	var selectedComponent = evt.getParameter("selectedItem").getBindingContext().getObject();
		// 	//Set the value to the right column item
		// 	this.getView().getController()._ComponentDialog.data("source").setValue(this.formatter.removeLeadingZerosFromString(
		// 		selectedComponent.Id));
		// 	var row = this.getView().getController()._ComponentDialog.data("source").getParent();
		// 	row.getCells()[2].setText(selectedComponent.Name); //Component's description
		// 	row.getCells()[4].setText(selectedComponent.UoM); //Component's UoM
		// },
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
					break; //Only one status will be selected
				}
			}

			//Selecting in the second table
			for (var j = 1; j < allStatuses.length; j++) {
				if (allStatuses[j] === "") {
					continue;
				}
				for (var m = 0; m < UserStatusesNoNumber.length; m++) {
					if ((UserStatusesNoNumber[m].Status + "      ").substring(0, 4) === (allStatuses[j] + "      ").substring(0, 4)) {
						oView.getController()._userStatusDialog.getContent()[1].addSelectionInterval(m, m);
						break;
					}
				}
			}
		}
	});

});
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
			//Dialog for attachment
			this._attachmentDialog = this.getView().byId("attachmentDialog");
			//Dialog for Pernr
			this._pernrDialog = this.getView().byId("idPernrDialog");
			
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
		},

		_onObjectMatched: function(oEvent) {
			this.getOwnerComponent().BusyDialogGlobal.close();
			
			if (oEvent.getParameter("name") !== "confirmOrder") {
				return;
			}
			var that = this;
			
			//Make data call
			var oView = this.getView();
			var sPath = "/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')";
			var parameters = {
				urlParameters: {
					"$expand": "Confirmations,OperationSteps,DamageCodeGroups/DamageCodes,CauseCodeGroups/CauseCodes,NotificationCodes,OrderAttachments,NotificationAttachments"
				},
				success: function(odata) {
					oView.setBusy(false);
					oView.bindElement({
						path: sPath
					});

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
						OperationSteps: odata.OperationSteps.results,
						OperationList: odata.OperationSteps.results.slice(),
						OrderAttachments: odata.OrderAttachments.results,
						NotificationAttachments: odata.NotificationAttachments.results
					});
					oView.setModel(jsonModel, "confirmModel");
					
					var emptyOperations = 9 - odata.OperationSteps.results.length;
					for (var step = 0; step < emptyOperations; step++) {
						that.createNewRowOperations();
					}					
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
		
		showPernrVH: function(){
			var pernrDialog = this.getView().getController()._pernrDialog;
			// this.getView().getController()._workCenterDialogList.removeSelections();
			// pernrDialog.data("source", oEvent.getSource());
			pernrDialog.open();			
		},
		
		OnPernrSearch:function(oEvent){

			//Get the search item
			var searchTerm = oEvent.getParameter("value");

			// var model = this.getOwnerComponent().getModel();

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
				parameters: {
					custom: {
						search: searchTerm
					}
				},
				events:{
					dataReceived: function(data){
						var i = 1;
					}
				}
			});
					
		},
		
		UpdateShortText: function(evt){
			var shortText = evt.getSource().getSelectedItem().getProperty("additionalText");
			var shortTextCell = evt.getSource().getParent().getAggregation("cells")[1];
			shortTextCell.setValue(shortText);
		},
		createNewRowOperations: function() {
			var currentOperationSteps = this.getView().getModel("confirmModel").getProperty("/OperationSteps");

			currentOperationSteps.push({
				"OperationID": "",
				"New": true,
				"Description": "",
				"WorkCenter": "",
				"Actual": "",
				"Unit": "",
				"WorkUnit":""
			});
			this.getView().getModel("confirmModel").setProperty("/OperationSteps", currentOperationSteps);
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
		updateNotificationGroup: function(evt){
			this.getView().getModel("confirmModel").setProperty("/WorkOrderDetail/NotificationCodeGroup", evt.getSource().getSelectedItem().getBindingContext().getObject().Group);
		},		
		SaveOrder: function() {

			var validator = new Validator();
			//Get Operations and components.
			var workOrderDetails = this.getView().getModel("confirmModel").oData;
			var confirmations = workOrderDetails.OperationSteps;

			//Remove empty components
			var newConfirmations = [];

			for (var i = 0; i < confirmations.length; i++) {
				//If one of these fields are not null, only then retian the record
				if (!confirmations[i].New || confirmations[i].OperationID) {
					newConfirmations.push(confirmations[i]);
				}
			}

			//Update the Operation Steps
			this.getView().getModel("confirmModel").setProperty("/OperationSteps", newConfirmations);

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

			currentWorkOrderDetail.OperationDowntime = workOrderDetails.WorkOrderDetail.OperationDowntime;
			currentWorkOrderDetail.DowntimeStart = workOrderDetails.WorkOrderDetail.DowntimeStart;
			currentWorkOrderDetail.DowntimeEnd = workOrderDetails.WorkOrderDetail.DowntimeEnd;
			currentWorkOrderDetail.Breakdown = workOrderDetails.WorkOrderDetail.Breakdown;
			currentWorkOrderDetail.BreakdownStart = workOrderDetails.WorkOrderDetail.BreakdownStart;
			currentWorkOrderDetail.BreakdownFinish = workOrderDetails.WorkOrderDetail.BreakdownFinish;
			
			//Job Completion
			currentWorkOrderDetail.JobCompletion = {};
			currentWorkOrderDetail.JobCompletion.TechnicalCompletion = workOrderDetails.WorkOrderDetail.JobCompletion.TechnicalCompletion;
			currentWorkOrderDetail.JobCompletion.JobComplete = workOrderDetails.WorkOrderDetail.JobCompletion.JobComplete;
			currentWorkOrderDetail.JobCompletion.DidNotExecute = workOrderDetails.WorkOrderDetail.JobCompletion.DidNotExecute;
			
			//Calculate changes and make approriate actions on Odata model
			this.getView().getModel().update("/WorkOrderDetailSet('" + workOrderDetails.WorkOrderDetail.OrderNumber + "')",
				currentWorkOrderDetail, {
					groupId: "saveAll"
				});

			for (i = 0; i < newConfirmations.length; i++) {
				var componentEntry = {};
				componentEntry.OrderNumber = workOrderDetails.WorkOrderDetail.OrderNumber;
				componentEntry.OperationID = newConfirmations[i].OperationID;
				componentEntry.WorkCenter = newConfirmations[i].WorkCenter;
				// componentEntry.Current = parseInt(newConfirmations[i].Work);
				componentEntry.Current = newConfirmations[i].Work;				
				componentEntry.Unit = newConfirmations[i].WorkUnit;
				componentEntry.PersonnelNumber = newConfirmations[i].PersonnelNumber;
				componentEntry.Remark = newConfirmations[i].Remarks;
				componentEntry.Final = newConfirmations[i].Final;

				if (componentEntry.Current > "0") {
					this.getView().getModel().create("/PostedConfirmations", componentEntry, {
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
		}
	});

});
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
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",
	"pd/pm/lite/customTypes/Operation",
	"pd/pm/lite/customTypes/Number",
	"pd/pm/lite/customTypes/Mandatory",
	"pd/pm/lite/customTypes/MandatoryDate",
	"pd/pm/lite/customTypes/ItemNumber",
	"pd/pm/lite/customTypes/ComponentId",
	"sap/m/DatePicker",
	"sap/ui/model/type/Date"
], function(Controller, JSONModel, MessageToast, DisplayListItem, Dialog, Button, Text, Message, MessageType, ValueState,
	Validator, MessagePopover, MessagePopoverItem) {
	// "use strict";

	return Controller.extend("pd.pm.lite.controller.NewOrder", {

		onInit: function() {
			this._oMP = new MessagePopover({
				items: {
					path: "message>/",
					template: new MessagePopoverItem({
						description: "{message>description}",
						type: "{message>type}",
						title: "{message>message}"
					})
				}
			});

			this._oMP.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");

			//Router
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			this.oModel = this.getOwnerComponent().getModel();
			this.oView = this.getView();
			this._busyDialog = this.getView().byId("ChangeBusyDialog");
			this._WorkCenterDialog = this.getView().byId("idWorkCenterDialog");
			// this._ComponentDialog = this.getView().byId("idComponentDialog");
			this._ComponentDialog = this.getView().byId("idMaterialDialog");			
			// this._ComponentDialog._oSearchField.setPlaceholder("Search by any column");
			this._workCenterDialogList = this.getView().byId("idWorkCenterDialogList");
			this.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();

			//Subscribe to data event
			this.getOwnerComponent().getEventBus().subscribe("RoutingChannel", "NewOrderData", this.onDataReceived, this);

			//THis model will be used for sending all the data
			this.createModel = new JSONModel();
			this.getView().setModel(this.createModel, "createModel");
		},
		
		onExit: function() {
			//Initialize the model before getting out
			this.createModel.setData(this.initialData);
		},
		
		onDataReceived: function(channel, event, data) {
			// do something with the data (bind to model)
			this.createModel.setProperty("/WorkOrderDetail/FunctionalLocation", data.FunctionalLocation);
			this.createModel.setProperty("/WorkOrderDetail/FunctionalLocationName", data.FunctionalLocationName);
			this.createModel.setProperty("/WorkOrderDetail/Plant", data.plant);
			if (data.EquipmentName !== undefined) { //It is a dummy number
				this.createModel.setProperty("/WorkOrderDetail/Equipment", data.Equipment);
				this.createModel.setProperty("/WorkOrderDetail/EquipmentName", data.EquipmentName);
			}
			this.createModel.setProperty("/WorkOrderDetail/MainWorkCenter", data.MainWorkCenter);

			//Read DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes
			var oView = this.getView();
			var sPath = "/ValueHelpSet(FunctionalLocation='" + data.FunctionalLocation + "',Equipment='" + data.Equipment +
				"')";
			var oParameters = {
				urlParameters: {
					"$expand": "DamageCodeGroups/DamageCodes,CauseCodeGroups/CauseCodes,NotificationCodes"
				},
				success: function(data) {
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
		},
		
		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "newOrder") {
				return;
			}
			//For defaulting dates
			var now = new Date();

			//End date is 180 days after today
			var after180days = new Date();
			after180days.setDate(after180days.getDate() + 180);

			//Activity Types value help
			var relevantActivityTypes = [];
			var activityTypes = [];
			activityTypes = this.getOwnerComponent().getModel("localStorageModel").getData().ActivityTypes;
			if (activityTypes) {
				for (var k = 0; k < activityTypes.length; k++) {
					if (activityTypes[k].OrderType === "PM01") { //all new orders are of type PM01
						relevantActivityTypes.push(activityTypes[k]);
					}
				}
			}

			this.initialData = {
				"ActivityTypes": relevantActivityTypes,
				"WorkOrderDetail": {
					ShortDescription: "",
					FunctionalLocation: "",
					FunctionalLocationName: "",
					Equipment: "",
					EquipmentName: "",
					BasicStart: now,
					BasicFinish: after180days,
					ScheduledStart: null,
					ScheduledFinish: null,
					OperationDowntime: false,
					BreakdownStart: now,
					BreakdownFinish: null,
					Breakdown: false,
					MainWorkCenter: "",
					Priority: "4",
					DowntimeStart: now,
					DowntimeEnd: null,
					Damage: {
						DamageCodeGroup: "",
						DamageCode: ""
					},
					Cause: {
						CauseCodeGroup: "",
						CauseCode: ""
					},
					Operations: [],
					Components: []
				}
			};

			var newEmptyObject = jQuery.extend(true, {}, this.initialData);
			this.createModel.setData(newEmptyObject);

			var step;
			for (step = 0; step < 5; step++) {
				this.createNewRowComponents();
				this.createNewRowOperations();
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
					// that.oMessageManager.addMessages(
					// 	new Message({
					// 		message: that.oMessageManager.getMessageModel().getData()[0].message,
					// 		type: MessageType.Error,
					// 		target: control.getId(),
					// 		processor: that.oMessageProcessor,
					// 		validation: true
					// 	})
					// );
					row.getCells()[1].setValue("");
					row.getCells()[2].setText(""); //Component's description
					row.getCells()[4].setText(""); //Component's UoM						

					that._oMP.openBy(that.getView().byId("save"));

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
		
		deleteSelectedComponents: function() {
			var that = this;

			//Get Table reference
			var componentTable = this.getView().byId("ComponentsTable");

			//Get selected rows
			var deletedRows = componentTable.getSelectedIndices();

			if (deletedRows.length === 0) {
				return;
			}
			var currentComponentsRef = that.getView().getModel("createModel").getProperty("/WorkOrderDetail/Components");
			var currentComponents = currentComponentsRef.slice();
			deletedRows.map(function(c) {
				//current context/Object
				var d = componentTable.getContextByIndex(c).getObject();

				//Delete them from json model.
				that.findAndRemove(currentComponents, "ItemID", d.ItemID);
				if (d.New !== "X") { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Components(OrderNumber='" + d.OrderNumber + "',ItemID='" + d.ItemID + "')", {
						groupId: "saveAll"
					});
				}
			});
			that.getView().getModel("createModel").setProperty("/WorkOrderDetail/Components", currentComponents);
		},
		
		deleteSelectedOperations: function() {
			var that = this;
			//Get Table reference
			var operationTable = this.getView().byId("OperationsTable");

			//Get selected rows
			var deletedRows = operationTable.getSelectedIndices();
			if (deletedRows.length === 0) {
				return; //No rows selected
			}

			var currentOperationsRef = that.getView().getModel("createModel").getProperty("/WorkOrderDetail/Operations");
			var currentOperations = currentOperationsRef.slice();
			if (currentOperations.length < 2) {
				var dialog = new Dialog({
					title: "Warning",
					type: "Message",
					content: new Text({
						text: "At least one Operation is required"
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
				return;
			}
			deletedRows.map(function(c) {
				//current context/Object
				var d = operationTable.getContextByIndex(c).getObject();
				//Delete them from json model.
				that.findAndRemove(currentOperations, "OperationID", d.OperationID);

				if (d.New !== "X") { //If this came from server  
					//Mark for sending a request later
					that.getView().getModel().remove("/Operations(OrderNumber='" + d.OrderNumber + "',OperationID='" + d.OperationID + "')", {
						groupId: "saveAll"
					});
				}
			});
			that.getView().getModel("createModel").setProperty("/WorkOrderDetail/Operations", currentOperations);
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
			//var oView = this.getView();
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
		
		goHomeNoPrompt: function() {
			// this.getView().getModel("createModel").setData(this.initialData);
			window.location.hash = "#";
		},
		
		updateNotificationGroup: function(evt){
			this.getView().getModel("createModel").setProperty("/WorkOrderDetail/NotificationCodeGroup", evt.getSource().getSelectedItem().getBindingContext().getObject().Group);
		},		
		
		SaveOrder: function() {
			var validator = new Validator();

			//Get Operations and components.
			var workOrderDetails = this.getView().getModel("createModel").oData;

			//Remove empty components
			var newComponents = [];
			var Components = workOrderDetails.WorkOrderDetail.Components;

			for (var i = 0; i < Components.length; i++) {
				//If one of these fields are not null, only then retian the record
				if (Components[i].Description || Components[i].RequirementQuantity) {
					newComponents.push(Components[i]);
				}
			}

			//Update the Components
			this.getView().getModel("createModel").setProperty("/WorkOrderDetail/Components", newComponents);

			//Remove Empty Operations
			var newOperations = [];
			var Operations = workOrderDetails.WorkOrderDetail.Operations;
			if (Operations.length > 1) { //One Operation is mandatory
				for (i = 0; i < Operations.length; i++) {
					//If one of these fields are not null, only then retian the record
					if (Operations[i].ShortText || Operations[i].WorkQuantity) {
						newOperations.push(Operations[i]);
					}
				}
				if (newOperations.length === 0) {
					newOperations.push(Operations[0]);
				}

				//Update the Operations
				this.getView().getModel("createModel").setProperty("/WorkOrderDetail/Operations", newOperations);
			}
			if (!validator.validate(this.getView())) {
				return;
			}
			//Perform the creation
			var that = this;
			that.getView().setBusy(true);
			this.oModel.create("/WorkOrderDetailSet", workOrderDetails.WorkOrderDetail, {
				success: function(data) {
					that.getView().setBusy(false);
					sap.ui.getCore().getMessageManager().removeAllMessages();
					var message = "Success. Order " + data.OrderNumber + " created";
					var dialog = new Dialog({
						title: "Information",
						type: "Message",
						content: new Text({
							text: message
						}),
						beginButton: new Button({
							text: "OK",
							press: function() {
								dialog.close();
								that.goHomeNoPrompt();
							}
						}),
						afterClose: function() {
							dialog.destroy();
						}
					});
					dialog.open();
				},
				error: function(evt) {
					that.getView().setBusy(false);
					that._oMP.openBy(that.getView().byId("save"));
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
			// ComponentDialog.removeAllItems();

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
				},
				events:{
					dataReceived: function(data){
						var i = 1;
					}
				}
			});
		}		
	});

});
sap.ui.define([
	"pd/pm/lite/controller/BaseController",
	"pd/pm/lite/util/formatter",
	"sap/m/MessageToast",
	"sap/m/StandardListItem"
], function(Controller, formatter, MessageToast, StandardListItem) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.ChangeOrder", {

		formatter: formatter,
		onInit: function() {
			var oRouter = this.getRouter();
			oRouter.attachRouteMatched(this._onObjectMatched, this);
			var model = this.getOwnerComponent().getModel();
			this.oView = this.getView();
			this._busyDialog = this.getView().byId("ChangeBusyDialog");
			this._WorkCenterDialog = this.getView().byId("idWorkCenterDialog");
			this._ComponentDialog = this.getView().byId("idComponentDialog");
			
			var standardListItem = new StandardListItem({title:"{Id}", description:"{Name}"});
			
			//Bind components and work centers value help
			var userPlant = model.getData("/UserSettings('dummy')").Plant;
			var oFilter1 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, "'" + userPlant + "'");
			this._WorkCenterDialog.bindAggregation("items", { path: "/WorkCenters", template: standardListItem, filters: [oFilter1]} );
			this._ComponentDialog.bindAggregation("items", "/ComponentValues", standardListItem );
		},

		_onObjectMatched: function(oEvent) {
			if (oEvent.getParameter("name") !== "changeOrder") {
				return;
			}

			//Make shell header items visible
			var headItems = this.getOwnerComponent().oContainer.getParent().getParent().getHeadItems();
			headItems[0].setVisible(true); //Home Button

			//Make data call
			var oView = this.getView();
			var sPath = "/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')";
			var parameters = {
				urlParameters: {
					"$expand": "Components,Operations,DamageCodeGroups,CauseCodeGroups,DamageCodes,CauseCodes,NotificationCodes,Units"
				},
				success: function(odata) {
					oView.setBusy(false);
					oView.bindElement({
						path: sPath
					});

					var jsonModel = new sap.ui.model.json.JSONModel();
					jsonModel.setData({
						Components: odata.Components.results,
						Operations: odata.Operations.results,
						WorkOrderDetail: odata
					});
					oView.setModel(jsonModel, "jsonModel");
				},
				failure: function() {
					oView.setBusy(false);
				}
			};
			oView.setBusy(true);
			oView.getModel().read("/WorkOrderDetailSet('" + oEvent.getParameter("arguments").order + "')", parameters);
		},
		createNewRowOperations: function() {
			var currentOperations = this.getView().getModel("jsonModel").getProperty("/Operations");
			currentOperations.push({
				"ActualWork": "",
				"OperationID": "0",
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
			currentComponents.push({
				"ComponentNumber": "",
				"ItemID": "0",
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
		SaveOrder: function() {
			//Get Operations and components.
			var workOrderDetails = this.getView().getModel("jsonModel").oData;
			var operations = workOrderDetails.Operations;
			var components = workOrderDetails.Components;

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
		showWorkCenterValueHelp: function(oEvent) {
				this.getView().getController()._WorkCenterDialog.open();
		},
		showComponentValueHelp: function(oEvent) {
				this.getView().getController()._ComponentDialog.open();
		}
	});

});
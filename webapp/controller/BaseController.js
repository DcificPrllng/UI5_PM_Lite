sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"pd/pm/lite/util/formatter",
	"sap/m/UploadCollectionItem",
	"sap/ui/model/Filter",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/Button"
], function (Controller, History, formatter, UploadCollectionItem, Filter, Dialog, Text, Button) {
	"use strict";

	return Controller.extend("pd.pm.lite.controller.BaseController", {
		formatter: formatter,
		onInit: function () {
			//Polyfill for IE11
			if (!String.prototype.endsWith) {
				String.prototype.endsWith = function (searchString, position) {
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
		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},
		onNavBack: function (oEvent) {
			var oHistory, sPreviousHash;

			oHistory = History.getInstance();
			sPreviousHash = oHistory.getPreviousHash();

			if (sPreviousHash !== undefined) {
				//window.top.history.go(-1);
				this.getRouter().navTo("appHome", {}, true /*no history*/ );
			} else {
				this.getRouter().navTo("appHome", {}, true /*no history*/ );
			}
		},
		ShowRightAttachments: function (evt) {
			var selectedButton = evt.getSource().getId();
			var modelName;
			if (selectedButton.indexOf("confirmView") > -1) {
				modelName = "confirmModel";
			} else if (selectedButton.indexOf("changeView") > -1) {
				modelName = "jsonModel";
			}
			var uploadCollection = this.getView().byId("UploadCollection");
			var order = uploadCollection.getModel(modelName).getProperty("/WorkOrderDetail/OrderNumber");
			var notification = uploadCollection.getModel(modelName).getProperty("/WorkOrderDetail/NotificationNumber");

			var urlPart;
			var DocumentId;
			if (selectedButton.endsWith("OrderRB")) {
				urlPart = "/OrderAttachments";
				uploadCollection.setUploadUrl("/sap/opu/odata/sap/ZWORKORDER_SRV/WorkOrderDetailSet('" + order + "')/OrderAttachments");
				DocumentId = order;
			} else {
				urlPart = "/NotificationAttachments";
				uploadCollection.setUploadUrl("/sap/opu/odata/sap/ZWORKORDER_SRV/WorkOrderDetailSet('" + notification +
					"')/NotificationAttachments");
				DocumentId = notification;
			}
			var oTemplate = new UploadCollectionItem({
				contributor: "{" + modelName + ">CreatedByID}",
				enableDelete: true,
				enableEdit: false,
				visibleEdit: false,
				fileName: "{" + modelName + ">FileName}",
				mimeType: "{" + modelName + ">MimeType}",
				uploadedDate: {
					path: "" + modelName + ">CreatedAt",
					formatter: this.formatter.date
				},
				url: "/sap/opu/odata/sap/ZWORKORDER_SRV" + urlPart + "(AttachmentId='{" + modelName + ">AttachmentId}',DocumentId='" +
					DocumentId +
					"')/$value"
			});
			uploadCollection.bindItems(modelName + ">" + urlPart, oTemplate);
		},
		onBeforeUploadStarts: function (oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

			//CSRF Token
			var csrfToken = this.getView().getModel().getSecurityToken();
			var oCustomerHeaderCsrfToken = new sap.m.UploadCollectionParameter({
				name: "X-CSRF-Token",
				value: csrfToken
			});
			oEvent.getParameters().addHeaderParameter(oCustomerHeaderCsrfToken);

			this.getView().byId("UploadCollection").setBusy(true);

		},
		onDialogClose: function (evt) {
			evt.getSource().getParent().close();
		},
		onFileDeleted: function (evt) {
			var modelName;
			if (evt.getSource().getId().indexOf("confirmView") > -1) {
				modelName = "confirmModel";
			} else if (evt.getSource().getId().indexOf("changeView") > -1) {
				modelName = "jsonModel";
			}
			var AttachmentId = evt.getParameter("item").getBindingContext(modelName).getObject().AttachmentId;
			var oDataModel = evt.getSource().getModel();
			var uploader = evt.getSource();

			var orderSelected = this.getView().byId("OrderRB").getSelected();
			var DocumentId = evt.getParameter("item").getBindingContext(modelName).getObject().DocumentId;
			var deletionUrl;
			if (orderSelected) {
				deletionUrl = "/OrderAttachments(AttachmentId='" + AttachmentId + "',DocumentId='" + DocumentId + "')";
			} else {
				deletionUrl = "/NotificationAttachments(AttachmentId='" + AttachmentId + "',DocumentId='" + DocumentId + "')";
			}

			//Start Busy indicator
			uploader.setBusy(true);

			//Trigger Delete
			var that = this;
			oDataModel.remove(deletionUrl, {
				success: function (response) {
					that.reloadAttachments();
				},
				error: function (error) {
					uploader.setBusy(false);
				}
			});
		},
		onUploadComplete: function () {
			// this.getView().byId("UploadCollection").setBusy(false);
			this.reloadAttachments();
		},
		reloadAttachments: function () {
			var currentViewId = this.getView().getId();
			var modelName;
			if (currentViewId.indexOf("confirmView") > -1) {
				modelName = "confirmModel";
			} else if (currentViewId.indexOf("changeView") > -1) {
				modelName = "jsonModel";
			}
			//Reload attachments
			var uploadCollection = this.getView().byId("UploadCollection");
			var order = uploadCollection.getModel(modelName).getProperty("/WorkOrderDetail/OrderNumber");
			var notification = uploadCollection.getModel(modelName).getProperty("/WorkOrderDetail/NotificationNumber");
			var readURL;
			var orderSelected = this.getView().byId("OrderRB").getSelected();
			if (orderSelected) {
				readURL = "/WorkOrderDetailSet('" + order + "')/OrderAttachments";
			} else {
				readURL = "/WorkOrderDetailSet('" + notification + "')/NotificationAttachments";
			}

			var jsonModel = uploadCollection.getModel(modelName).getData();
			//Read attachements
			this.getView().getModel().read(readURL, {
				success: function (oData) {
					uploadCollection.setBusy(false);

					if (orderSelected) {
						jsonModel.OrderAttachments = oData.results;
					} else {
						jsonModel.NotificationAttachments = oData.results;
					}

					//Check if there are any attachments left. If yes, ensure that ATCH exists. If no attachments are left, then remove ATCH
					var currentStatus = jsonModel.WorkOrderDetail.UserStatus;
					// if ((jsonModel.OrderAttachments.length > 0) || (jsonModel.NotificationAttachments.length > 0)) {
					if (jsonModel.OrderAttachments.length > 0) {
						if (currentStatus.search("ATCH") === -1) {
							//Set the user status ATCH		
							//Length of current status 
							if (currentStatus.length % 5 === 0) {
								jsonModel.WorkOrderDetail.UserStatus = currentStatus + ("ATCH ");
							} else if (currentStatus.length % 5 === 1) {
								jsonModel.WorkOrderDetail.UserStatus = currentStatus + ("    ATCH ");
							} else if (currentStatus.length % 5 === 2) {
								jsonModel.WorkOrderDetail.UserStatus = currentStatus + ("   ATCH ");
							} else if (currentStatus.length % 5 === 3) {
								jsonModel.WorkOrderDetail.UserStatus = currentStatus + ("  ATCH ");
							} else if (currentStatus.length % 5 === 4) {
								jsonModel.WorkOrderDetail.UserStatus = currentStatus + (" ATCH ");
							}
						}
					} else {
						if (currentStatus.search("ATCH")) {
							jsonModel.WorkOrderDetail.UserStatus = jsonModel.WorkOrderDetail.UserStatus.replace("ATCH ", "");
							jsonModel.WorkOrderDetail.UserStatus = jsonModel.WorkOrderDetail.UserStatus.replace("ATCH", ""); //If ATCH is the last status"
						}
					}
					uploadCollection.getModel(modelName).setData(jsonModel);
				}
			});
		},
		onUploadTerminated: function (err) {
			this.getView().byId("UploadCollection").setBusy(false);
			//Show errors

		},
		ShowAttachmentDialog: function () {
			this.getView().getController()._attachmentDialog.open();
		},
		OnComponentSearch: function (oEvent) {
			//Get the search item
			var searchTerm = oEvent.getParameter("value");

			var model = this.getOwnerComponent().getModel();

			//Bind components and work centers value help
			var userSettings = model.getData("/UserSettings('dummy')");
			var userPlant;
			if (!userSettings) {
				userPlant = this.getView().getBindingContext().getObject().Plant;
			} else {
				userPlant = userSettings.Plant;
			}
			var oFilter1 = new Filter("Plant", sap.ui.model.FilterOperator.EQ, userPlant);

			//Bind items
			var oTemplate = new sap.m.ColumnListItem({
				cells: [
					new Text().bindText({
						path: "Id",
						formatter: this.formatter.removeLeadingZerosFromString
					}),
					new Text({
						text: "{Name}"
					}),
					new Text({
						text: "{MPN}"
					}),
					new Text({
						text: "{Manufacturer}"
					})
				]
			});
			var that = this;
			var updateTitle = function (evt) {
				var count = evt.getParameters().data.__count;
				var formattedCount = formatter.integerWithThousandsSeparator(count, this.getModel("i18n").getResourceBundle().getText("matches"));
				//Convert into 
				this.setTitle("Components (" + formattedCount + ")");
			};
			that._ComponentDialog.bindAggregation("items", {
				path: "/NewComponents",
				template: oTemplate,
				filters: [oFilter1],
				parameters: {
					custom: {
						search: searchTerm
					}
				}
			});
			that._ComponentDialog.getBinding("items").attachDataReceived(updateTitle, that._ComponentDialog);
		},
		filterTable: function () {
			var allFilters = [];
			var materialNumber = this.getView().byId("SAPMaterialNumber").getValue();
			var description = this.getView().byId("MaterialDescription").getValue();
			var MPN = this.getView().byId("MPN").getValue();
			var oFilter;
			if (materialNumber.length) {
				oFilter = new Filter("MaterialNumber", sap.ui.model.FilterOperator.Contains, materialNumber.toUpperCase());
				allFilters.push(oFilter);
			}

			if (description.length) {
				oFilter = new Filter("Description", sap.ui.model.FilterOperator.Contains, description.toUpperCase());
				allFilters.push(oFilter);
			}
			if (MPN.length) {
				oFilter = new Filter("MPN", sap.ui.model.FilterOperator.Contains, MPN.toUpperCase());
				allFilters.push(oFilter);
			}
			this.getView().byId("componentTable").getBinding("items").filter(allFilters);
		},

		onClearFilter: function () {
			//Clear filters
			this.getView().byId("SAPMaterialNumber").setValue("");
			this.getView().byId("MaterialDescription").setValue("");
			this.getView().byId("MPN").setValue("");
			this.getView().byId("componentTable").getBinding("items").filter(null);
		},
		
		onBeforeRebindTable: function (oEvent) {
			var oBindingParams = oEvent.getParameter("bindingParams");
			oBindingParams.filters = this.getFilterData();
		},

		updateSelectedMaterial: function (evt) {
			//Get selection
			var oTable = this.getView().byId("componentTable");
			// var selectedIndex = oTable.getSelectedIndex();
			if (!oTable.getSelectedItem()) { //Nothing selected
				var dialog = new Dialog({
					title: "Error",
					type: "Message",
					state: "Error",
					content: new Text({
						text: "Choose a material and then press 'Select'"
					}),
					beginButton: new Button({
						text: "OK",
						press: function () {
							dialog.close();
						}
					}),
					afterClose: function () {
						dialog.destroy();
					}
				});
				dialog.open();
				return;
			}
			var selectedComponent = oTable.getSelectedContexts()[0].getObject();

			//Remove selection
			// oTable.setSelectedIndex(-1);

			//Close the dialog
			evt.getSource().getParent().close();

			//Set the value to the right column item
			this.getView().getController()._ComponentDialog.data("source").setValue(this.formatter.removeLeadingZerosFromString(
				selectedComponent.MaterialNumber));
			var row = this.getView().getController()._ComponentDialog.data("source").getParent();
			row.getCells()[2].setText(selectedComponent.Description); //Component's description
			row.getCells()[4].setText(selectedComponent.UoM); //Component's UoM			
		},
		
		showComponentValueHelp: function (oEvent) {
			var ComponentDialog = this.getView().getController()._ComponentDialog;
			ComponentDialog.data("source", oEvent.getSource());
			//Clear current entries
			// ComponentDialog.removeAllItems();
			this.getView().getController()._ComponentDialog.open();
		}
	});

});
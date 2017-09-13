sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"pd/pm/lite/util/formatter",
	"sap/m/UploadCollectionItem"
], function(Controller, History, formatter, UploadCollectionItem) {
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
		},
		ShowRightAttachments: function(evt) {
			var selectedButton = evt.getSource().getId();
			var modelName;
			if (selectedButton.indexOf("confirmView") > -1 ) 	{
				modelName = "confirmModel";
			}else if (selectedButton.indexOf("changeView") > -1 ) {
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
				url: "/sap/opu/odata/sap/ZWORKORDER_SRV" + urlPart + "(AttachmentId='{" + modelName + ">AttachmentId}',DocumentId='" + DocumentId +
					"')/$value"
			});
			uploadCollection.bindItems(modelName + ">" + urlPart, oTemplate);
		},
		onBeforeUploadStarts: function(oEvent) {
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
		onDialogClose: function(evt) {
			evt.getSource().getParent().close();
		},
		onFileDeleted: function(evt) {
			var modelName;
			if (evt.getSource().getId().indexOf("confirmView") > -1 ) 	{
				modelName = "confirmModel";
			}else if (evt.getSource().getId().indexOf("changeView") > -1 ) {
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
				success: function(response) {
					that.reloadAttachments();
				},
				error: function(error) {
					uploader.setBusy(false);
				}
			});
		},
		onUploadComplete: function() {
			// this.getView().byId("UploadCollection").setBusy(false);
			this.reloadAttachments();
		},
		reloadAttachments: function() {
			var currentViewId = this.getView().getId();
			var modelName;
			if (currentViewId.indexOf("confirmView") > -1 ) 	{
				modelName = "confirmModel";
			}else if (currentViewId.indexOf("changeView") > -1 ) {
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
				success: function(oData) {
					if (orderSelected) {
						jsonModel.OrderAttachments = oData.results;
					} else {
						jsonModel.NotificationAttachments = oData.results;
					}
					uploadCollection.getModel(modelName).setData(jsonModel);
					uploadCollection.setBusy(false);
				}
			});
		},
		onUploadTerminated: function(err) {
			this.getView().byId("UploadCollection").setBusy(false);
			//Show errors

		},
		ShowAttachmentDialog: function() {
			this.getView().getController()._attachmentDialog.open();
		}		
	});

});
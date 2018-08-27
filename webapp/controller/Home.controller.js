sap.ui.define([
	"pd/pm/lite/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"pd/pm/lite/util/formatter",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/m/MessageToast",
	"sap/m/Button"
], function (BaseController, JSONModel, formatter, MessageBox, Filter, MessageToast, Button) {
	"use strict";
	return BaseController.extend("pd.pm.lite.controller.Home", {

			onDisplayNotFound: function (oEvent) {
				// display the "notFound" target without changing the hash
				this.getRouter().getTargets().display("notFound", {
					fromTarget: "home"
				});
			},
			formatter: formatter,
			onInit: function () {
				//Router
				var oRouter = this.getRouter();
				oRouter.attachRouteMatched(this._onObjectMatched, this);
				this._ComponentDialog = this.getView().byId("idComponentDialog");
				this._oTable = this.getView().byId("ordersTable");
				this._oCount = this.getView().byId("countId");
				this._busyDialog = this.getView().byId("BusyDialog");
				jQuery.sap.require("jquery.sap.storage");
				this._oJQueryStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);
				this._oHierarchyPopupNew = {};
				this._oEntryListPopup = {};
				var chartModel = new JSONModel();

				this.getView().setModel(chartModel, "chartdata");
			},

			_onObjectMatched: function (oEvent) {
				if (oEvent.getParameter("name") !== "appHome") {
					return;
				}
				//Set Tootips
				this.setTooltips();
			},

			onAfterRendering: function () {
				var that = this;
				var oModel = that.getView().getModel();
				//Do not refresh everytime the view is loaded
				if (oModel.getData("/WorkOrders") === undefined) {
					this._busyDialog.open();
					oModel.read(
						"/WorkOrders", {
							groupId: "initialRead",
							success: function (oData) {
								that._busyDialog.close();
								that.getView().getModel("localModel").setData(oData);
								that._oTable.bindRows("localModel>/results");
								var oBinding = that._oTable.getBinding("rows");
								that._oCount.setText("Total Records: " + oBinding.getLength()); //Count for the initial run
								oBinding.attachChange(function () { //This event will be called by any change. Ex: Filtering, Search etc.
									that._oCount.setText("Total Records: " + oBinding.getLength());
								});
							},
							error: function () {
								this._busyDialog.close();
							}
						});

					this.getView().byId("toolBar").bindElement("/UserSettings('dummy')", {
						groupId: "initialRead"
					});
					this.getView().byId("toolBar").getElementBinding().attachDataReceived(function (evt) {
						this._userDefaults = evt.getParameter("data");
						var oFilter1 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, this._userDefaults.Plant);
						var oFilter2 = new sap.ui.model.Filter("WorkCenter", sap.ui.model.FilterOperator.EQ, this._userDefaults.WorkCenter);
						var oFilter3 = new sap.ui.model.Filter("ViewType", sap.ui.model.FilterOperator.EQ, this._userDefaults.ViewType);
						var combinedFilter = [oFilter1, oFilter2, oFilter3];
						this._currentFilter = combinedFilter;
						if (this._userDefaults.ViewType === "Headers") {
							this.showOperationColumns(false);
						} else {
							this.showOperationColumns(true);
						}
						//Pre Fetch the hierarchy for the user's default plant
						this.createHierarchyPopup(this._userDefaults.Plant);
					}.bind(this));

					this.getView().getModel().submitChanges({ //There are no changes here. It is just initial reads for user settings and value helps
						groupId: "initialRead"
					});
				}
			},

			setTooltips: function () {
				//Sch.
				var sHtml = "Schedule Compliance<br>";
				sHtml += "<hr>";
				sHtml += "<p><strong>Red: </strong> Work Order is overdue (Past its Scheduled Finish Date)</p>";
				sHtml += "<hr>";
				sHtml += "<p><strong>Yellow:</strong> Work Order is due now (Between its Scheduled Start and Finish)</p>";
				sHtml += "<hr>";
				sHtml += "<p><strong>Green:</strong> Work Order is not due yet (Scheduled Start is in the future)</p>";

				var oRttTextField = new sap.m.Popover({
					content: [
						new sap.ui.core.HTML({
							content: sHtml
						})
					]
				});

				//Schedule Column
				this.attachPopoverOnMouseover(this._oTable.getColumns()[4].getLabel(), oRttTextField);

				//Days
				var sHtmlDays = "Days<br>";
				sHtmlDays += "<hr>";
				sHtmlDays += "<p> Number of days until scheduled finish date (Positive)</p>";
				sHtmlDays += "<hr>";
				sHtmlDays += "<p> Number of days after scheduled finish date (Negative)</p>";

				var oRttTextFieldDays = new sap.m.Popover({
					content: [
						new sap.ui.core.HTML({
							content: "Hi"
						})
					]
				});
				this.attachPopoverOnMouseover(this._oTable.getColumns()[5].getLabel(), oRttTextFieldDays);
			},

			attachPopoverOnMouseover: function (targetControl, popover) {
				targetControl.addEventDelegate({
					onmouseover: this._showPopover.bind(this, targetControl, popover),
					onmouseout: this._clearPopover.bind(this, popover),
				}, this);
			},

			_showPopover: function (targetControl, popover) {
				this._timeId = setTimeout(() => popover.openBy(targetControl), 400);
			},

			_clearPopover: function (popover) {
				clearTimeout(this._timeId) || popover.close();
			},

			searchTable: function (evt) {
				var oTable = this.getView().byId("ordersTable");
				var searchTerm = evt.getParameter("query");
				if (searchTerm === "") {
					//When clear was pressed on search field
					oTable.getBinding("rows").filter(null);
				} else {
					var filters = [];
					var outerFilters = [];
					var searchTerms = searchTerm.split(" "); //words separated by space are considered as separate search terms. 
					for (var k = 0; k < searchTerms.length; k++) {
						filters.push(new sap.ui.model.Filter("OrderNumber", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("OrderType", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("FunctionalLocation", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("FLDescription", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("Equipment", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						filters.push(new sap.ui.model.Filter("EquipmentName", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
						outerFilters.push(new sap.ui.model.Filter(filters));
						filters = [];
					}
					oTable.getBinding("rows").filter(new sap.ui.model.Filter({
						filters: outerFilters,
						and: true //Default is OR between filters
					}));
				}
			},

			showComponentValueHelp: function (oEvent) {
				var ComponentDialog = this.getView().getController()._ComponentDialog;
				//ComponentDialog.data("source", oEvent.getSource());

				//Clear current entries
				ComponentDialog.removeAllItems();

				this.getView().getController()._ComponentDialog.open();
			},

			triggerPrint: function () {
				var oView = this.getView();

				//Selected row data
				var selectedIndices = this._oTable.getSelectedIndices();
				if (selectedIndices.length > 10) {
					//Upto 10 orders can be printed at a time
					//raise error
					MessageBox.error(
						"You can select maximum of 10 orders"
					);
					return;
				}
				if (selectedIndices.length === 0) {
					//Nothing selected
					//raise error
					MessageBox.error(
						"Select orders to be printed"
					);
					return;
				}

				//Call function-import to Print
				var oModel = this._oTable.getModel();
				var urlParameters = {};
				for (var i = 1; i <= 10; i++) {
					if (i <= selectedIndices.length) {
						urlParameters["OrderNumber" + i] = this._oTable.getContextByIndex(selectedIndices[i - 1]).getProperty("OrderNumber");
					} else {
						urlParameters["OrderNumber" + i] = "";
					}
				}
				oView.setBusyIndicatorDelay(100);
				oView.setBusy(true);
				oModel.callFunction("/PrintWorkOrders", {
					method: "GET",
					urlParameters: urlParameters,
					success: function (oData, response) {
						oView.setBusy(false);
						MessageToast.show("Orders sent to printer");
					},
					error: function (oError) {
						oView.setBusy(false);

					}
				});

			},

			triggerMM03: function () {
				//Open MM03
				var data = {};
				this.gotoPersonas("MM03", data);
			},

			gotoIW31: function (evt) {
				//Get Selected Data
				var hierarchyTable = evt.getSource().getParent().getContent()[0];
				var selectedObject = hierarchyTable.getContextByIndex(hierarchyTable.getSelectedIndex()).getObject();

				//Check if nothing was selected
				var data = {};
				data.plant = this.getView().byId("plantId").getSelectedKey();
				data.MainWorkCenter = this.getView().byId("workCenterId").getSelectedKey();
				if (data.MainWorkCenter === "*" || data.MainWorkCenter === "E*") {
					data.MainWorkCenter = this._userDefaults.WorkCenter; //go back to the user's default work center
				}
				if (selectedObject.FunctionalLocation) { //This is a Functional location
					data.FunctionalLocation = selectedObject.Id;
					data.FunctionalLocationName = selectedObject.Name;
				} else { //This is an equipment
					data.Equipment = selectedObject.Id;
					data.EquipmentName = selectedObject.Name;
					data.FunctionalLocation = selectedObject.ParentFL_ID;
					//Get FL Name
					var fl = formatter.getObjects(hierarchyTable.getModel().getData().root, "Id", data.FunctionalLocation);
					if (fl.length > 0) {
						data.FunctionalLocationName = fl[0].Name;
					}
				}

				//Close the popup
				hierarchyTable.getParent().close();

				//Navigate
				this.getRouter().navTo("newOrder");

				//Pass Data
				this.getOwnerComponent().getEventBus().publish("RoutingChannel", "NewOrderData", data);

				//Close the popup
				hierarchyTable.getParent().close();
			},

			triggerConfirm: function (evt) {
				var context = evt.getSource().getParent().getBindingContext("localModel");
				var data = {};
				data.OrderNumber = context.getProperty("OrderNumber");
				this.getRouter().navTo("confirmOrder", {
					order: data.OrderNumber
				});
			},

			triggerChange: function (evt) {
				var context = evt.getSource().getParent().getBindingContext("localModel");
				var data = {};
				data.OrderNumber = context.getProperty("OrderNumber");
				this.getRouter().navTo("changeOrder", {
					order: data.OrderNumber
				});
			},

			performLogout: function () {
				this.getView().setBusy(true);
				window.location.replace("/sap/public/bc/icf/logoff");
			},

			getIcon: function (oType) {
				if (oType) {
					return "sap-icon://functional-location";
				} else {
					return "sap-icon://technical-object";
				}
			},

			getTooltip: function (oType) {
				if (oType) {
					return "Functional Location";
				} else {
					return "Equipment";
				}
			},

			getTimeStamp: function () {
				// Create a date object with the current time
				var now = new Date();
				// Create an array with the current month, day and time
				var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
				// Create an array with the current hour, minute and second
				var time = [now.getHours(), now.getMinutes(), now.getSeconds()];
				// Determine AM or PM suffix based on the hour
				var suffix = (time[0] < 12) ? "AM" : "PM";
				// Convert hour from military time
				time[0] = (time[0] < 12) ? time[0] : time[0] - 12;
				// If hour is 0, set it to 12
				time[0] = time[0] || 12;
				// If seconds and minutes are less than 10, add a zero
				for (var i = 1; i < 3; i++) {
					if (time[i] < 10) {
						time[i] = "0" + time[i];
					}
				}
				// Return the formatted string
				return date.join("/") + " " + time.join(":") + " " + suffix;
			},

			createHierarchyPopup: function (plant) {
				var controller = this;
				var oRowTemplate = new sap.ui.layout.HorizontalLayout({
					content: [new sap.ui.core.Icon({
						src: {
							path: "FunctionalLocation",
							formatter: controller.getIcon
						},
						tooltip: {
							path: "FunctionalLocation",
							formatter: controller.getTooltip
						}
					}), new sap.m.Text({
						text: "{Name}"
					})]
				});
				var oHierarchyTable = new sap.ui.table.TreeTable({
					expandFirstLevel: true,
					visibleRowCountMode: "Auto",
					minAutoRowCount: 10,
					columns: [new sap.ui.table.Column({
						label: "ID",
						template: new sap.m.Text({
							text: "{Id}"
						})
					}), new sap.ui.table.Column({
						label: "Name",
						template: oRowTemplate
					})],
					selectionBehavior: sap.ui.table.SelectionBehavior.Row,
					selectionMode: sap.ui.table.SelectionMode.Single,
					enableColumnReordering: true,
					extension: [new sap.m.Toolbar({
						content: [
							new sap.m.SearchField({
								width: "400px",
								placeholder: "Enter Search term here",
								search: [this.searchHierarchy, controller]
							})
						]
					})]
				}).addStyleClass("hierarchy");

				//Add table to a Dialog and open
				var oHierarchyPopup = new sap.m.Dialog({
						title: "Select Functional Location/Equipment",
						width: "768px",
						contentHeight: "95%",
						content: oHierarchyTable,
						buttons: [new Button({
							text: "Create Order",
							type: "Emphasized",
							press: [controller.gotoIW31, controller]
						})]
				});

			//Store the hierarchy dialog
			this._oHierarchyPopupNew[plant] = oHierarchyPopup;

			//Set Data to the popup
			this.setDataToHierarchyPopup(oHierarchyPopup, plant);
		},

		setDataToHierarchyPopup: function (popup, plant) {
			var that = this;

			//Get current hash
			var currentHash = this._oJQueryStorage.get("hash_" + plant);

			popup.setBusyIndicatorDelay(100);
			popup.setBusy(true);

			var oModel4Hierarchies = this.getView().getModel();
			//Plant filter
			var plantFilter = new sap.ui.model.Filter("ParentId", sap.ui.model.FilterOperator.EQ, plant);
			oModel4Hierarchies.setHeaders({
				"If-None-Match": currentHash
			});

			//Make a server call and pass the hash
			oModel4Hierarchies.read("/CompleteHierarchy", {
				filters: [plantFilter],
				success: function (data, response) {
					//Check repsonse header to see if "No_Change" was sent
					if (response.headers.no_change) {
						//No change in the data. Set the data from local storage
						var hierarchy = that._oJQueryStorage.get("hierarchy_" + plant);
					} else {
						//If "no_change" was not sent, then store the result
						var flat = {};
						//Create a Json
						for (var i = 0; i < data.results.length; i++) {
							var key = data.results[i].Id;
							flat[key] = data.results[i];
							flat[key].children = []; // add children container    
							flat[key].__metadata = ""; // metadata not relevant for tree table
						}

						// populate the child container arrays         
						for (var i1 in flat) {
							var parentkey = flat[i1].ParentId;
							if (flat[parentkey]) {
								flat[parentkey].children.push(flat[i1]);
							}
						}
						// find the root nodes (no parent found) and create the hierarchy tree from them         
						var root = [];
						for (var i2 in flat) {
							var parentkey2 = flat[i2].ParentId;
							if (!flat[parentkey2]) {
								root.push(flat[i2]);
							}
						}
						hierarchy = {
							root: root
						};
						//Store in localstorage
						that._oJQueryStorage.put("hierarchy_" + plant, hierarchy);
						that._oJQueryStorage.put("hash_" + plant, response.headers.new_hash);
					}
					var oTreeModel = new sap.ui.model.json.JSONModel();
					oTreeModel.setData(hierarchy);
					popup.setModel(oTreeModel);
					popup.getContent()[0].bindRows({
						path: "/root"
					});
					popup.setBusy(false);
				},
				error: function () {
					popup.setBusy(false);
				}
			});
		},

		openHierarchyPopup: function () {
			//Get the current plant in the screen
			var plant = this.getView().byId("plantId").getSelectedKey();

			//If the popup does not already exist, create it
			if (!this._oHierarchyPopupNew.hasOwnProperty(plant)) {
				this.createHierarchyPopup(plant);
			}
			//Open the popup
			this._oHierarchyPopupNew[plant].open();
		},

		createNew: function () {
			var controller = this;
			if (!this._hierarchyPopup) {
				if (!this._oHierarchyTable) {
					var oTemplate2 = new sap.ui.layout.HorizontalLayout({
						content: [new sap.ui.core.Icon({
							src: {
								path: "FunctionalLocation",
								formatter: controller.getIcon
							},
							tooltip: {
								path: "FunctionalLocation",
								formatter: controller.getTooltip
							}
						}), new sap.m.Text({
							text: "{Name}"
						})]
					});
					this._oHierarchyTable = new sap.ui.table.TreeTable({
						columns: [new sap.ui.table.Column({
							label: "ID",
							width: "300px",
							template: new sap.m.Text({
								text: "{Id}"
							})
						}), new sap.ui.table.Column({
							label: "Name",
							template: oTemplate2
						})],
						selectionBehavior: sap.ui.table.SelectionBehavior.Row,
						selectionMode: sap.ui.table.SelectionMode.Single,
						enableColumnReordering: true,
						extension: [new sap.m.Toolbar({
							content: [
								new sap.m.Label("timestamp"),
								new sap.m.Button({
									text: "Refresh",
									press: [this.refreshHierarchy, this]
								}),
								new sap.m.ToolbarSpacer(),
								new sap.m.SearchField({
									width: "200px",
									placeholder: "Enter Search term here",
									search: [this.searchHierarchy, controller]
								})
							]
						})]
					});
				}

				//Add table to a Dialog and open
				this._hierarchyPopup = new sap.m.Dialog({
					title: "Select Functional Location/Equipment",
					width: "650px",
					content: this._oHierarchyTable,
					buttons: [new sap.m.Button({
						text: "Create Order",
						press: [controller.gotoIW31, {
							table: this._oHierarchyTable,
							controller: controller
						}]
					})]
				});
			}
			//Get from local storage
			var data = {};
			var plant = this.getView().byId("plantId").getSelectedKey();
			data = this._oJQueryStorage.get("hierarchy_" + plant);
			var hierarchyFrom = this._oJQueryStorage.get("hierarchy_" + plant + "_StoredOn");
			var timeStampLabel = sap.ui.getCore().byId("timestamp");
			if (timeStampLabel) {
				timeStampLabel.setText(hierarchyFrom);
			}

			if (!data) { //No data found in the local storage
				var currentHash = this._oJQueryStorage.get("hash_" + plant);
				this.refreshFromServer(currentHash);
			} else {
				var oTreeModel = new sap.ui.model.json.JSONModel();
				oTreeModel.setData(data);
				this._oHierarchyTable.setModel(oTreeModel);
				this._oHierarchyTable.bindRows({
					path: "/root"
				});
			}
			this._hierarchyPopup.open();
		},

		searchHierarchy: function (evt) {
			var plant = this.getView().byId("plantId").getSelectedKey();
			var searchTerm = evt.getParameter("query");

			var searchTerms = searchTerm.split(" "); //words separated by space are considered as separate search terms. 

			//Store the search terms
			this._oHierarchyPopupNew[plant].getContent()[0].data("searchterms", searchTerms);

			if (searchTerms.length === 1 && searchTerms[0] === "") {
				//When clear was pressed on search field
				this._oHierarchyPopupNew[plant].getContent()[0].getBinding("rows").filter(null);
				this._oHierarchyPopupNew[plant].getContent()[0].collapseAll();
				this._oHierarchyPopupNew[plant].getContent()[0].expandToLevel(1); //If search is cleared, show only upto first level
			} else {
				var filters = [];
				var outerFilter = [];
				for (var k = 0; k < searchTerms.length; k++) {
					filters.push(new sap.ui.model.Filter("Id", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
					filters.push(new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, searchTerms[k]));
					outerFilter.push(new sap.ui.model.Filter(filters));
					filters = [];
				}
				this._oHierarchyPopupNew[plant].getContent()[0].getBinding("rows").filter(new sap.ui.model.Filter({
					filters: outerFilter,
					and: true
				}));
				//Expand all hierarchy, to show all search results
				this._oHierarchyPopupNew[plant].getContent()[0].expandToLevel(10);

				var oHierarchyTable = this._oHierarchyPopupNew[plant].getContent()[0];
				oHierarchyTable.addEventDelegate({});
			}
		},

		refreshHierarchy: function () {
			var plant = this.getView().byId("plantId").getSelectedKey();
			var currentHash = this._oJQueryStorage.get("hash_" + plant);
			this._oJQueryStorage.remove("hierarchyStoredOn");
			this.refreshFromServer(currentHash);
			// Above fetch should happen only once per application load. Have a parameter to indicate that the hierarchy for this plant has already been fetched.
			// If the hierarchy has to be fetched from server again, application has to be reloaded. (browser refresh)
		},

		showOperations: function () {
			//Selected row data
			var selectedIndices = this._oTable.getSelectedIndices();
			if (selectedIndices.length > 10) {
				//Upto 10 orders can be shown at a time
				//raise error
				MessageBox.error(
					"You can select upto 10 orders"
				);
				return;
			}
			if (selectedIndices.length === 0) {
				//Nothing selected
				//raise error
				MessageBox.error(
					"Select atleast one order"
				);
				return;
			}

			var orderData = {};
			for (var i = 1; i <= selectedIndices.length; i++) {
				orderData["Order" + i] = this._oTable.getContextByIndex(selectedIndices[i - 1]).getProperty("OrderNumber");
			}
			this.gotoPersonas("ZOPERATIONS_PERSONAS", orderData);
		},

		refreshFromServer: function (currentHash) {
			//If no data, then get it from server
			this._hierarchyPopup.setBusyIndicatorDelay(100);
			this._hierarchyPopup.setBusy(true);
			var oModel4Hierarchies = new sap.ui.model.odata.v2.ODataModel({
				serviceUrl: "/sap/opu/odata/sap/ZWORKORDER_SRV?",
				serviceUrlParams: {
					"sap-client": jQuery.sap.getUriParameters().mParams["sap-client"][0] !== null ? jQuery.sap.getUriParameters().mParams[
							"sap-client"][0] : "100" //if client was mentioned in url, pass it on
				}
			});
			var that = this;

			//Plant filter
			var plant = that.getView().byId("plantId").getValue();
			var plantFilter = new sap.ui.model.Filter("ParentId", sap.ui.model.FilterOperator.EQ, plant);
			oModel4Hierarchies.setHeaders({
				"If-None-Match": currentHash
			});
			oModel4Hierarchies.read("/CompleteHierarchy", {
				filters: [plantFilter],
				success: function (data, response) {
					//Check repsonse header to see if "No_Change" was sent
					if (response.headers["no_change"]) {
						//Nothing to do. No change in the data
						that._hierarchyPopup.setBusy(false);
						return;
					}
					var flat = {};
					//Create a Json
					for (var i = 0; i < data.results.length; i++) {
						var key = data.results[i].Id;
						flat[key] = data.results[i];
						flat[key].children = []; // add children container    
						flat[key].__metadata = ""; // metadata not relevant for tree table
					}

					// populate the child container arrays         
					for (var i1 in flat) {
						var parentkey = flat[i1].ParentId;
						if (flat[parentkey]) {
							flat[parentkey].children.push(flat[i1]);
						}
					}

					// find the root nodes (no parent found) and create the hierarchy tree from them         
					var root = [];
					for (var i2 in flat) {
						var parentkey2 = flat[i2].ParentId;
						if (!flat[parentkey2]) {
							root.push(flat[i2]);
						}
					}
					data = {
						root: root
					};
					//Store in localstorage
					that._oJQueryStorage.put("hierarchy_" + plant, data);
					that._oJQueryStorage.put("hierarchy_" + plant + "_StoredOn", "Last refreshed at " + that.getTimeStamp());
					that._oJQueryStorage.put("hash_" + plant, response.headers.new_hash);
					sap.ui.getCore().byId("timestamp").setText(that._oJQueryStorage.get("hierarchy_" + plant + "_StoredOn"));

					var oTreeModel = new sap.ui.model.json.JSONModel();
					oTreeModel.setData(data);
					that._oHierarchyTable.setModel(oTreeModel);
					that._oHierarchyTable.bindRows({
						path: "/root"
					});
					that._hierarchyPopup.setBusy(false);
				},
				error: function () {
					that._hierarchyPopup.setBusy(false);
				}
			});
		}, //called by refreshHierarchy

		triggerMeasurement: function () {
			// var json = {};
			// this.gotoPersonas("IK34", json);

			//Check if Entry List for the Plant is already available
			var plant = this.getView().byId("plantId").getSelectedKey();

			//If the popup does not already exist, create it
			if (!this._oEntryListPopup.hasOwnProperty(plant)) {
				var oEntryListPopup = sap.ui.xmlfragment(this.getView().getId(), "pd.pm.lite.view.EntryList", this);
				this._oEntryListPopup[plant] = oEntryListPopup;
			}

			//Set Data to the popup
			this.setDataToEntryListPopup(oEntryListPopup, plant);

			//Open the popup
			this._oEntryListPopup[plant].open();
		},

		setDataToEntryListPopup: function (oControl, plant) {
			var that = this;
			this._oEntryListPopup[plant].setBusy(true);

			this._oEntryListPopup[plant] //Ideally there hsould be no requirement to set model, as the view alreayd has the model and popup is 'dependent'. But somehow it doesnt work.
				.setModel(this.getView().getModel("localStorageModel"), "localStorageModel");

			//Check if the Entry List data is available in local storage
			var oEntryListStoredData = this._oJQueryStorage.get("EntryList_" + plant);

			//If data is available, check if it is older than 7 days
			if (oEntryListStoredData) {
				this._oEntryListPopup[plant].setBusy(false);
				var EntryListFetchTimestamp = this._oJQueryStorage.get("EntryListFetchTimestamp_" + plant);
				var difference = this.getTimeStamp() - EntryListFetchTimestamp;
				var daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
				var dataExpired;
				if (daysDifference > 7) {
					dataExpired = true;
				}
			}

			//If the data is not available, fetch from server. If No change, then set the local storage timestamp
			if (dataExpired || !oEntryListStoredData) {
				//Current hash
				var currentEntryListHash = this._oJQueryStorage.get("EntryList_hash_" + plant);
				var oModel = this.getView().getModel();
				oModel.setHeaders({
					"If-None-Match": currentEntryListHash
				});
				var oFilter = new Filter("Plant", sap.ui.model.FilterOperator.EQ, plant);

				oModel.read("/EntryLists", {
					filters: [oFilter],
					success: function (data, response) {
						if (response.headers.no_change) {
							//No change in the data. Set the data from local storage
							oEntryListStoredData = this._oJQueryStorage.get("EntryList_" + plant);
						} else {
							oEntryListStoredData = data.results;
							//Store in localstorage
							that._oJQueryStorage.put("EntryList_" + plant, oEntryListStoredData);
							that._oJQueryStorage.put("EntryList_hash_" + plant, response.headers.new_hash);
						}
						//Update the timestamp
						that._oJQueryStorage.get("EntryListFetchTimestamp_" + plant, that.getTimeStamp());

						//Set data to local storage model
						var localStorageModel = that.getView().getModel("localStorageModel");
						var currentData = localStorageModel.getData();
						currentData.EntryLists = oEntryListStoredData;
						localStorageModel.setData(currentData);
						that._oEntryListPopup[plant].setBusy(false);
					},
					error: function (err) {
						that._oEntryListPopup[plant].setBusy(false);
					}
				});
			} else {
				//Set data to local storage model
				var localStorageModel = that.getView().getModel("localStorageModel");
				var currentData = localStorageModel.getData();
				currentData.EntryLists = oEntryListStoredData;
				localStorageModel.setData(currentData);
				this._oEntryListPopup[plant].setBusy(false);
			}
		},

		showMeasurementScreen: function (evt) {
			this.getRouter().navTo("measurement", {
				entryList: evt.getParameter("listItem").getBindingContext("localStorageModel").getObject().Id
			});
		},

		closeDialog: function () {
			this._oEntryListPopup[this.getView().byId("plantId").getSelectedKey()].close();
		},

		gotoPersonas: function (tcode, data) {
			this.getRouter().navTo("personas");
			var url = this._userDefaults.PersonasUrl + "#" + tcode + "&" + JSON.stringify(data);
			document.getElementById("webguiFrame").src = url;
			if (!$("#webguiFrame").contents().find("iframe")[0]) { //This will be null when first calling Personas
				return;
			}
			//Call the Personas transaction
			$("#webguiFrame").contents().find("iframe")[0].contentWindow.sap.personas.scripting.executeScriptInternal({
				src: 'session.startTransaction("' + tcode + '");'
			});
		},

		showOrders: function () {
			//Selected row data
			var selectedIndices = this._oTable.getSelectedIndices();
			if (selectedIndices.length > 10) {
				//Upto 10 orders can be shown at a time
				//raise error
				MessageBox.error(
					"You can select upto 10 orders"
				);
				return;
			}
			if (selectedIndices.length === 0) {
				//Nothing selected
				//raise error
				MessageBox.error(
					"Select atleast one order"
				);
				return;
			}

			var orderData = {};
			for (var i = 1; i <= selectedIndices.length; i++) {
				orderData["Order" + i] = this._oTable.getContextByIndex(selectedIndices[i - 1]).getProperty("OrderNumber");
			}
			this.gotoPersonas("ZORDERS_PERSONAS", orderData);
		},

		showOperationColumns: function (value) {
			this.getView().byId("Operations1").setVisible(value);
			this.getView().byId("Operations2").setVisible(value);
			this.getView().byId("Operations3").setVisible(value);
		},

		getFilteredOrders: function () {

			this._busyDialog.open();

			//Find new filter values
			var plant = this.getView().byId("plantId").getSelectedKey();
			var workCenter = this.getView().byId("workCenterId").getSelectedKey();
			var viewType = this.getView().byId("viewTypeId").getSelectedKey();

			if (viewType === "Headers") {
				this.showOperationColumns(false);
			} else {
				this.showOperationColumns(true);
			}

			var oFilter1 = new sap.ui.model.Filter("Plant", sap.ui.model.FilterOperator.EQ, plant);
			var oFilter2 = new sap.ui.model.Filter("WorkCenter", sap.ui.model.FilterOperator.EQ, workCenter);
			var oFilter3 = new sap.ui.model.Filter("ViewType", sap.ui.model.FilterOperator.EQ, viewType);
			var combinedFilter = [oFilter1, oFilter2, oFilter3];

			var that = this;
			this.getView().getModel().read(
				"/WorkOrders", {
					filters: combinedFilter,
					success: function (oData) {
						that._busyDialog.close();
						that.getView().getModel("localModel").setData(oData);
					}
				});
		}
	});
});
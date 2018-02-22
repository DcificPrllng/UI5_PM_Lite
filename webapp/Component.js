sap.ui.define([
	"sap/ui/core/UIComponent",
	"sap/ui/Device",
	"pd/pm/lite/util/formatter",
	"sap/ui/model/odata/v2/ODataModel"
], function(UIComponent, Device, formatter, Omodel) {
	"use strict";

	return UIComponent.extend("pd.pm.lite.Component", {

		metadata: {
			manifest: "json"
		},

		init: function() {
			// call the init function of the parent
			UIComponent.prototype.init.apply(this, arguments);

			// create the views based on the url/hash
			this.getRouter().initialize();

			// var oModel = new Omodel({
			// 	serviceUrl: "/sap/opu/odata/sap/ZWORKORDER_SRV",
			// 	defaultBindingMode: "OneWay",
			// 	refreshAfterChange: false,
			// 	defaultCountMode: sap.ui.model.odata.CountMode.Inline
			// });
			
			var oModel = this.getModel();
			oModel.setDeferredBatchGroups(["saveAll", "initialRead", "saveMeasurements"]);

			//json Model
			var jsonModel = new sap.ui.model.json.JSONModel();
			this.setModel(jsonModel, "localModel");
			// this.setModel(oModel); //We are doing explicit binding here as we need extra serviceUrlParameters
			oModel.setSizeLimit(500); //Units have 250+ entries

			//Local storage
			jQuery.sap.require("jquery.sap.storage");
			this._oJQueryStorage = jQuery.sap.storage(jQuery.sap.storage.Type.local);

			//Get Plants, WorkCenters and Units
			//Update from local storage
			var localStorageModel = new sap.ui.model.json.JSONModel();
			localStorageModel.setSizeLimit(300);
			this.setModel(localStorageModel, "localStorageModel");
			
			var plants = this._oJQueryStorage.get("_plants");
			var workCenters = this._oJQueryStorage.get("_workCenters");
			var units = this._oJQueryStorage.get("_units");
			var userStatuses = this._oJQueryStorage.get("_userStatuses");
			var activityTypes = this._oJQueryStorage.get("_activityTypes");			
			
			var that = this;
			localStorageModel.setData({
				"Plants": plants,
				"WorkCenters": workCenters,
				"Units": units,
				"UserStatuses": userStatuses,
				"ActivityTypes": activityTypes,
				"EntryLists":{},
				"MeasurementPoints":{}
			});
			
			var plantHash = this._oJQueryStorage.get("plantHash");
			var wcHash = this._oJQueryStorage.get("wcHash");
			var unitHash = this._oJQueryStorage.get("unitHash");
			var userStatusesHash = this._oJQueryStorage.get("userStatusesHash");
			var activityTypesHash = this._oJQueryStorage.get("activityTypesHash");			
			
			oModel.setHeaders({
				"plantHash": plantHash,
				"wcHash": wcHash,
				"unitHash": unitHash,
				"userStatusesHash":userStatusesHash,
				"activityTypesHash":activityTypesHash
			});
			oModel.read("/Plants", {
				groupId: "initialRead",
				success: function(oData, response) {
					if (response.headers["no_change"]){
						//Nothing to do
					}
					else{
						//Update the local storage value help data
						that._oJQueryStorage.put("_plants", oData.results);
						//Update the local storage hash
						that._oJQueryStorage.put("plantHash", response.headers["new_hash"]);
						//Update the localStorage json model
						var currentData = localStorageModel.getData();
						currentData.Plants = oData.results;
						localStorageModel.setData(currentData);
					}
				}
			});
			oModel.read("/WorkCenters", {
				groupId: "initialRead",
				success: function(oData, response) {
					if (response.headers["no_change"]){
						//Nothing to do
					}
					else{
						//Update the local storage value help data
						that._oJQueryStorage.put("_workCenters", oData.results);
						//Update the local storage hash
						that._oJQueryStorage.put("wcHash", response.headers["new_hash"]);
						//Update the localStorage json model
						var currentData = localStorageModel.getData();
						currentData.WorkCenters = oData.results;
						localStorageModel.setData(currentData);
					}
				}
			});
			oModel.read("/Units", {
				groupId: "initialRead",
				success: function(oData, response) {
					if (response.headers["no_change"]){
						//Nothing to do
					}
					else{
						//Update the local storage value help data
						that._oJQueryStorage.put("_units", oData.results);
						//Update the local storage hash
						that._oJQueryStorage.put("unitHash", response.headers["new_hash"]);
						//Update the localStorage json model
						var currentData = localStorageModel.getData();
						currentData.Units = oData.results;
						localStorageModel.setData(currentData);
					}
				}
			});	
			oModel.read("/UserStatusValueHelp", {
				urlParameters: {$expand: "UserStatusesNoNumber,UserStatusesWithNumber"},
				groupId: "initialRead",
				success: function(oData, response) {
					if (response.headers["no_change"]){ 
						//Nothing to do
					}
					else{
						//Update the local storage value help data
						that._oJQueryStorage.put("_userStatuses", oData.results);
						//Update the local storage hash
						that._oJQueryStorage.put("userStatusesHash", response.headers["new_hash"]);
						//Update the localStorage json model
						var currentData = localStorageModel.getData();
						currentData.UserStatuses = oData.results;
						localStorageModel.setData(currentData);
					}
				}
			});	
			oModel.read("/ActivityTypes", {
				groupId: "initialRead",
				success: function(oData, response) {
					if (response.headers["no_change"]){ 
						//Nothing to do
					}
					else{
						//Update the local storage value help data
						that._oJQueryStorage.put("_activityTypes", oData.results);
						//Update the local storage hash
						that._oJQueryStorage.put("activityTypesHash", response.headers["new_hash"]);
						//Update the localStorage json model
						var currentData = localStorageModel.getData();
						currentData.ActivityTypes = oData.results;
						localStorageModel.setData(currentData);
					}
				}
			});				
		}

	});

});
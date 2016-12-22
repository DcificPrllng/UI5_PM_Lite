sap.ui.define([
	"pd/pm/lite/controller/BaseController"
], function(BaseController) {
	"use strict";

	return BaseController.extend("pd.pm.lite.controller.personas", {
			onAfterRendering: function() {
		        //Update the hash
		        var hashParts = window.location.hash.substr(1).split("/");
		        //$("#webguiFrame").prop("src", "/sap/bc/personas?sap-client=200#" + hashParts[0] );
			}

	});

});
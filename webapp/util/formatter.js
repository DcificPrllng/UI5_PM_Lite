sap.ui.define(["sap/ui/core/format/DateFormat"], function(DateFormat) {
	"use strict";
	return {
		removeLeadingZerosFromString: function(numberString) {
			if (numberString === "" || numberString === "0") {
				return "";
			}
			return parseInt(numberString, 10);
		},
		orderNumber: function(orderNumber) {
			return parseInt(orderNumber, 10);
		},
		equipment: function(number, desc) {
			if (!desc) {
				return "";
			}
			return parseInt(number, 10) + " (" + desc + ")";
		},
		treeId: function(id, functionalLocation) {
			if (functionalLocation) {
				return id;
			}
			return parseInt(id, 10);
		},
		days: function(date) {
			var today = new Date();
			var finishDate = new Date(date);
			var difference = Math.round((finishDate - today) / (1000 * 60 * 60 * 24));
			var value = (difference < 0) ? "(" + (difference * -1) + ")" : difference;
			return value;
		},
		date: function(date) {
			var oDateFormat = DateFormat.getDateInstance({
				pattern: "MM/dd/yyyy"
			});
			return oDateFormat.format(new Date(date));
		},
		statusIcon: function(color) {
			switch (color) {
				case "G":
					return "sap-icon://status-completed";
				case "R":
					return "sap-icon://status-error";
				case "Y":
					return "sap-icon://status-critical";
			}

		},
		statusIconColor: function(color) {
			switch (color) {
				case "G":
					return "green";
				case "R":
					return "red";
				case "Y":
					return "#f0ab00";
			}
		},
		editableId: function(newItem) {
			if (newItem === "undefined") {
				return false;
			} else {
				return true;
			}
		},
		idAndName: function(id, name) {
			if (name !== "") {
				return id + " (" + name + ")";
			} else {
				return id;
			}
		}
	};
});
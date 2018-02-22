sap.ui.define(["sap/ui/core/format/DateFormat", "sap/ui/core/format/NumberFormat"], function(DateFormat, NumberFormat) {
	"use strict";
	return {
		MeasurementObject: function(object, objectID, objectName) {
			return object + " - " + this.getView().getController().formatter.removeLeadingZerosFromString(objectID) + " - " + objectName;
		},
		// ID and Description Formatting
		commonIDFormatter: function(sID, sDescription) {
			if (sID) {
				if (sDescription) {
					var resourceBundle = this.getView().getModel("i18n").getResourceBundle();
					var isnum = /^\d+$/.test(sID); //Only for numbers
					if (isnum) {
						sID = parseInt(sID, 10); //Remove leading zeroes
					}
					return resourceBundle.getText("Formatting.DescriptionAndId", [
						sDescription, sID
					]);
				}
				return sID;
			}
			if (sDescription) {
				return sDescription;
			}
			return "";
		},
		confirmationActive: function(systemStatus) {
			if (systemStatus === "R" || systemStatus === "PC") {
				return true;
			} else {
				return false;
			}
		},
		confirmationNotActive: function(systemStatus) {
			if (systemStatus !== "R" && systemStatus !== "PC") {
				return true;
			} else {
				return false;
			}
		},
		BasicDateEditable: function(status) {
			if (status.substring(0, 4) !== "CRTD") { //Only 'Created' Orders cannot have Dates editable. Dates are driven by 'Priority' in this case
				return true;
			} else {
				return false;
			}
		},
		PriorityEditable: function(status) {
			if (status.substring(0, 4) === "CRTD") { //If status is 'CRTD' only then 'Priority' is editable
				return true;
			} else {
				return false;
			}
		},
		removeLeadingZerosFromString: function(numberString) {
			if (numberString === "" || numberString === "0" || numberString === undefined) {
				return "";
			}
			var number = parseInt(numberString, 10);
			if (number === 0) {
				return "";
			} else {
				return number;
			}
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
		functionalLocation: function(number, desc) {
			if (!desc) {
				return "";
			}
			return number + " (" + desc + ")";
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
			if (!date) {
				return "";
			}
			var oDateFormat = DateFormat.getDateInstance({
				// pattern: "MM/dd/yyyy",
				pattern: "MMM d,y",
				UTC: true
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
		getObjects: function(obj, key, val) {
			var objects = [];
			for (var i in obj) {
				if (!obj.hasOwnProperty(i)) {
					continue;
				}
				if (typeof obj[i] === "object") {
					objects = objects.concat(this.getObjects(obj[i], key, val));
				} else if (i === key && obj[key] === val) {
					objects.push(obj);
					return objects;
				}
			}
			return objects;
		},
		duration: function(label, start, end) {
			var startDate = new Date(start);
			var endDate = new Date(end);
			var hours;
			if (!start || !end) {
				hours = 0;
			} else {
				hours = Math.abs(endDate - startDate) / 36e5;
			}
			return label.concat(isNaN(hours) === true ? 0 : hours.toFixed(2) + " Hours");
		},
		integerWithThousandsSeparator: function(number, string){
			var oIntegerInstance = NumberFormat.getIntegerInstance({
				style: "standard",
				groupingEnabled: true
			});
			var formattedNumber = oIntegerInstance.format(number) + " " + string;
			return formattedNumber;
		}

	};
});
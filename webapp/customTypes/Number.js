sap.ui.define(["sap/ui/model/ValidateException",
	"sap/ui/model/SimpleType"
], function(ValidateException, SimpleType) {
	return SimpleType.extend("pd.pm.lite.customTypes.Number", {
		formatValue: function(oValue) {
			return oValue;
		},
		parseValue: function(oValue) {
			if (isNaN(Number(oValue))) {
				return "";
			}
			return oValue;
		},
		validateValue: function(oValue) {
			if (isNaN(Number(oValue)) || Number(oValue) === 0) {
				var messageString = "Enter a valid number";
				throw new ValidateException(messageString);
			}
		}
	});
});
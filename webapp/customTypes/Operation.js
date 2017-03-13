sap.ui.define(["sap/ui/model/ValidateException",
	"sap/ui/model/SimpleType"
], function(ValidateException, SimpleType) {
	return SimpleType.extend("pd.pm.lite.customTypes.Operation", {
		formatValue: function(oValue) {
			return oValue;
		},
		parseValue: function(oValue) {
			return oValue;
		},
		validateValue: function(oValue) {
			if (oValue != null && oValue !== "" && oValue !== undefined) {
				if (isNaN(Number(oValue))) {
					var messageString = "Not a valid reference number";
					throw new ValidateException(messageString);
				}
			} else {
				var message = "Enter a reference to an operation";
				throw new ValidateException(message);
			}
		}
	});
});
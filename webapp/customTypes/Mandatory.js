sap.ui.define(["sap/ui/model/ValidateException",
	"sap/ui/model/SimpleType"
], function(ValidateException, SimpleType) {
	return SimpleType.extend("pd.pm.lite.customTypes.Mandatory", {
		formatValue: function(oValue) {
			return oValue;
		},
		parseValue: function(oValue) {
			return oValue;
		},
		validateValue: function(oValue) {
			if (oValue === null || oValue === "" || oValue === undefined) {
				var message = "Enter a value";
				throw new ValidateException(message);
			}
		}
	});
});
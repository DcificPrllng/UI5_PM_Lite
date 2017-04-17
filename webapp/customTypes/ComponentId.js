sap.ui.define(["sap/ui/model/ValidateException",
	"sap/ui/model/SimpleType"
], function(ValidateException, SimpleType) {
	return SimpleType.extend("pd.pm.lite.customTypes.ComponentId", {
		formatValue: function(oValue) {
			if (oValue === "") {
				return oValue;
			}
			else if (oValue === undefined){
				return "";
			}
			return parseInt(oValue, 10);
		},
		parseValue: function(oValue) {
			return oValue;
		},
		validateValue: function(oValue) {
			if (oValue === null || oValue === "" || oValue === undefined) {
				var message = "Enter a valid component";
				throw new ValidateException(message);
			}
		}
	});
});
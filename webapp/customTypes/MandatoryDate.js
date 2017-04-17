sap.ui.define(["sap/ui/model/ValidateException",
	"sap/ui/model/type/Date"
], function(ValidateException, Date) {
	return Date.extend("pd.pm.lite.customTypes.MandatoryDate", {
		validateValue: function(oValue) {
			if (oValue === null || oValue === "" || oValue === undefined) {
				var message = "Enter a value";
				throw new ValidateException(message);
			}
		}
	});
});
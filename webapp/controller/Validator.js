// The MIT License (MIT)

// Copyright (c) 2015 Qualiture

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

sap.ui.define([
	'sap/ui/core/message/Message',
	'sap/ui/core/MessageType'
], function(Message, MessageType) {
	"use strict";

	var Validator = function() {
		this._isValid = true;
		this._isValidationPerformed = false;
	};

	/**
	 * Returns true _only_ when the form validation has been performed, and no validation errors were found
	 * @memberof nl.qualiture.plunk.demo.utils.Validator
	 *
	 * @returns {boolean}
	 */
	Validator.prototype.isValid = function() {
		return this._isValidationPerformed && this._isValid;
	};

	/**
	 * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
	 * @memberof nl.qualiture.plunk.demo.utils.Validator
	 *
	 * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
	 * @return {boolean} whether the oControl is valid or not.
	 */
	Validator.prototype.validate = function(oControl) {
		this._isValid = true;
		sap.ui.getCore().getMessageManager().removeAllMessages();
		this._validate(oControl);
		return this.isValid();
	};

	/**
	 * Recursively validates the given oControl and any aggregations (i.e. child controls) it may have
	 * @memberof nl.qualiture.plunk.demo.utils.Validator
	 *
	 * @param {(sap.ui.core.Control|sap.ui.layout.form.FormContainer|sap.ui.layout.form.FormElement)} oControl - The control or element to be validated.
	 */
	Validator.prototype._validate = function(oControl) {
		var aPossibleAggregations = ["rows", "cells", "pages", "items", "content", "form", "formContainers", "formElements", "fields",
				"sections", "subSections", "_grid"
			],
			aControlAggregation = null,
			oControlBinding = null,
			aValidateProperties = ["value", "selectedKey", "text"], // yes, I want to validate Select and Text controls too
			isValidatedControl = false,
			oExternalValue, oInternalValue,
			i, j;

		var oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
		var oMessageManager = sap.ui.getCore().getMessageManager();

		// only validate controls and elements which have a 'visible' property
		if (oControl instanceof sap.ui.core.Control ||
			oControl instanceof sap.ui.layout.form.FormContainer ||
			oControl instanceof sap.ui.layout.form.FormElement ||
			(oControl instanceof sap.ui.table.Row && oControl._bHidden === false)) { //Exclude hidden rows in a table. 

			// only check visible controls (invisible controls make no sense checking)
			//             if (oControl.getVisible()) {

			// check control for any properties worth validating 
			for (i = 0; i < aValidateProperties.length; i += 1) {
				if (oControl.getBinding(aValidateProperties[i])) {
					// check if a data type exists (which may have validation constraints)
					if (oControl.getBinding(aValidateProperties[i]).getType()) {
						// try validating the bound value
						try {
							oControlBinding = oControl.getBinding(aValidateProperties[i]);
							oExternalValue = oControl.getProperty(aValidateProperties[i]);
							oInternalValue = oControlBinding.getType().parseValue(oExternalValue, oControlBinding.sInternalType);
							oControlBinding.getType().validateValue(oInternalValue);
						}
						// catch any validation errors
						catch (ex) {
							this._isValid = false;
							oControlBinding = oControl.getBinding(aValidateProperties[i]);
							oMessageManager.addMessages(
								new Message({
									message: ex.message,
									type: MessageType.Error,
									// target   : ( oControlBinding.getContext() ? oControlBinding.getContext().getPath() + "/" : "") +
									//         oControlBinding.getPath(),
									target: oControl.getId() + "/" + aValidateProperties[i],
									processor: oMessageProcessor,
									validation: true
								})
							);
						}
						isValidatedControl = true;
					}
				}
			}

			// if the control could not be validated, it may have aggregations
			if (!isValidatedControl) {
				for (i = 0; i < aPossibleAggregations.length; i += 1) {
					aControlAggregation = oControl.getAggregation(aPossibleAggregations[i]);

					if (aControlAggregation) {
						// generally, aggregations are of type Array
						if (aControlAggregation instanceof Array) {
							for (j = 0; j < aControlAggregation.length; j += 1) {
								this._validate(aControlAggregation[j]);
							}
						}
						// ...however, with sap.ui.layout.form.Form, it is a single object *sigh*
						else {
							this._validate(aControlAggregation);
						}
					}
				}
			}
			//             }
		}
		this._isValidationPerformed = true;
	};

	return Validator;
});
import { Joi } from "celebrate";
import type { CustomHelpers, CustomValidator, ErrorReport } from "joi";
import { isValidPhoneNumber } from "libphonenumber-js/max";

const phoneNumberValidation: CustomValidator = (value: string, helper: CustomHelpers): string | ErrorReport => {
  if (!isValidPhoneNumber(value)) {
    return helper.message({
      "any.custom": "Invalid phone number",
      "string.base": "'phone_number' should be of type string",
      "string.empty": "'phone_number' cannot be an empty field",
      "any.required": '"phone_number is required',
    });
  }
  return value;
};

export const validator = {
  register: {
    body: Joi.object({
      pubKey: Joi.object({
        x: Joi.string().required(),
        y: Joi.string().required(),
      }).required(),
      sig: Joi.object({
        r: Joi.string().required(),
        s: Joi.string().required(),
        v: Joi.string().required(),
      }).required(),
      number: Joi.string().required().custom(phoneNumberValidation),
    }).required(),
  },
  passwordlessStart: {
    body: Joi.object({
      address: Joi.string().required(),
    }).required(),
  },
  verify: {
    body: Joi.object({
      address: Joi.string().required(),
      code: Joi.string().required().length(6),
      data: Joi.object().optional(),
    }).required(),
  },
};

const AppError = require("../utils/app-error");
const { validateContact } = require("../validators/contact.validator");
const contactRepo = require("../repositories/contact.repository");

async function saveContact(input, deps = {}) {
  const { repo = contactRepo } = deps;
  const { value, errors } = validateContact(input);
  if (errors.length) throw new AppError(400, "Data pesan tidak valid", errors);
  await repo.insertMessage(value);
}
module.exports = { saveContact };

import { useEffect } from 'react';
import { useFormContext, useController } from 'react-hook-form';
import { Form, Input } from 'antd';

export const invalidUsernames = {};
export const invalidEmails = {};

const errorsMap = new Map([
  ['username', new Map([['minLength', 'Username needs to be at least 3 characters']])],
  ['email', new Map([['pattern', 'Invalid email']])],
  ['password', new Map([['minLength', 'Your password needs to be at least 6 characters']])],
  [
    'password-confirm',
    new Map([
      ['validatePassword', 'Passwords must match'],
      ['unconfirmed', 'Password confirmation required'],
    ]),
  ],
  [
    'image',
    new Map([
      ['pattern', 'Invalid URL'],
      ['checkImgUrl', 'Image format or URL is invalid'],
    ]),
  ],
]);

export const clarifyErrorMessage = (inputName, error, formInstance) => {
  const messagesMap = errorsMap.get(inputName);
  if (!messagesMap) return;
  if (error.type == 'serverResponse') {
    if (inputName == 'username') error.message = invalidUsernames[formInstance.getFieldValue('username')];
    else if (inputName == 'email') error.message = invalidEmails[formInstance.getFieldValue('email')];
  } else error.message = messagesMap.get(error.type);
};

export const redrawErrors = (formInstance, errors) => {
  const articleTagsErrorList = [];
  const visibleErrors = formInstance
    .getFieldsError()
    .filter((fieldInfo) => {
      if (fieldInfo.name[0] == 'tagList' && fieldInfo.name.length > 1 && fieldInfo.errors.length > 0) {
        articleTagsErrorList.push(fieldInfo.name[1]);
        return false;
      }
      return true;
    })
    .map((fieldInfo) => {
      const result = { name: fieldInfo.name[0], error: fieldInfo.errors[0] };
      if (fieldInfo.name[0] == 'tagList') {
        result.error = { subfields: articleTagsErrorList.splice(0) };
      }
      return result;
    });
  const fields = [];
  for (const field of visibleErrors) {
    if (field.name == 'tagList') {
      const subfields = errors.tags || [];
      for (const subfieldIdx of field.error.subfields) {
        const err = subfields[subfieldIdx] || {};
        if (err.type != 'required') {
          fields.push({ name: ['tagList', subfieldIdx], errors: null });
        }
      }
    }
    if (!errors[field.name] && field.error !== undefined) {
      const { name } = field;
      fields.push({ name, errors: null });
    }
  }
  if (fields.length > 0) formInstance.setFields(fields);
};

export const useValidation = (formState, formInstance) => {
  const { errors, isSubmitted } = formState;
  useEffect(() => {
    let fields = [];
    if (isSubmitted && errors['password'] && !errors['password-confirm']) {
      errors['password-confirm'] = { type: 'unconfirmed' };
    }
    for (const [name, error] of Object.entries(errors)) {
      if (name == 'tagList') {
        for (const idx in error) fields.push({ name: ['tagList', parseInt(idx)], errors: ['Shouldn\x27t be empty'] });
        continue;
      } else if (!error.message) clarifyErrorMessage(name, error, formInstance);
      fields.push({ name, errors: [error.message] });
    }
    redrawErrors(formInstance, errors);
    formInstance.setFields(fields);
  }, [formState]);
};

export const standardRequiredField = { required: 'This field is required' };

const InputField = ({
  name,
  placeholder,
  label,
  maxLength,
  rules = {},
  password: isPasswordField,
  multiline: isTextArea,
  defaultValue,
  onBlur,
  onChange,
}) => {
  const { trigger } = useFormContext();
  const {
    field,
    fieldState: { isDirty },
    formState: { errors },
  } = useController({ name, rules, defaultValue });
  const inputProps = { ...field, maxLength };
  if (isPasswordField) {
    placeholder = label == 'New password' ? label : 'Password';
    inputProps.type = 'password';
  }
  if (!onBlur)
    onBlur = () => {
      if (isDirty) trigger(name);
    };
  if (!onChange)
    onChange = () => {
      const error = errors[name];
      if (error) {
        trigger(name);
      }
    };
  Object.assign(inputProps, { placeholder });
  if (!label) label = placeholder;
  const component = isTextArea ? <Input.TextArea {...inputProps} /> : <Input {...inputProps} />;
  return (
    <Form.Item label={label} name={field.name} {...{ onBlur, onChange }}>
      {component}
    </Form.Item>
  );
};

export default InputField;

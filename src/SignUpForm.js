import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { CheckCircleTwoTone } from '@ant-design/icons';
import { App, Card, Form, Checkbox, Button } from 'antd';
import { Link, useHistory } from 'react-router-dom';

import InputField, { standardRequiredField, invalidUsernames, invalidEmails, useValidation } from './InputField';
import { actions as storeActions, store } from './reducer';

const usePasswordValidation = (() => {
  let getFieldValue;
  const validate = (value) => {
    const password = getFieldValue();
    return value == password;
  };
  return (formInstance, fieldName) => {
    useEffect(() => {
      getFieldValue = formInstance.getFieldValue.bind(null, fieldName);
    }, []);
    return validate;
  };
})();

const useRequest = () => {
  const [isWaitingForServerResponse, setWaitingForServerResponse] = useState(false);
  const [responseData, setResponseData] = useState({ errors: null });
  const { modal } = App.useApp();
  const history = useHistory();
  return {
    isWaitingForServerResponse,
    responseErrors: responseData.errors,
    sendRequest: (data) => {
      const { username, email, password } = data;
      setWaitingForServerResponse(true);
      fetch('https://blog.kata.academy/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { username, email, password } }),
      })
        .then((response) => {
          if (!response.ok && response.status != 422) throw new Error('An unknown error occured');
          return response.json();
        })
        .then((data) => {
          setResponseData(data);
          const { errors } = data;
          if (errors) {
            if (Object.keys(errors).filter((errorEnt) => !~['username', 'email'].indexOf(errorEnt)).length > 0)
              throw new Error('An unknown error occured');
            return false;
          }
          const { username, token } = data.user;
          localStorage.setItem('credentials', JSON.stringify({ username, token }));
          storeActions.setCredentials(data.user);
          return true;
        })
        .then(
          (ok) => {
            if (ok) {
              modal.info({
                title: 'Account created',
                icon: <CheckCircleTwoTone twoToneColor="#2c0" />,
                onOk: () => {
                  setWaitingForServerResponse(false);
                  history.push('/');
                },
              });
              return;
            }
            setWaitingForServerResponse(false);
          },
          (error) => {
            modal.error({
              title: error.message,
              onOk: () => {
                setWaitingForServerResponse(false);
              },
            });
          }
        );
    },
  };
};

const SignUpForm = ({ history }) => {
  const { credentials = {} } = store.getState();
  if (credentials.username && credentials.token) history.replace('/profile');
  const [formInstance] = Form.useForm();
  const formContext = useForm();
  const {
    handleSubmit,
    trigger,
    setError,
    formState: { isSubmitted, isValid },
  } = formContext;
  const [isAgreeForProcessingData, setAgreeForProcessingData] = useState(true);
  const { isWaitingForServerResponse, sendRequest, responseErrors } = useRequest();
  useEffect(() => {
    if (isSubmitted && responseErrors) {
      if (responseErrors.username) invalidUsernames[formInstance.getFieldValue('username')] = responseErrors.username;
      if (responseErrors.email) invalidEmails[formInstance.getFieldValue('email')] = responseErrors.email;
      setError(Object.keys(responseErrors)[0], { type: 'serverResponse' });
      trigger(undefined, { shouldFocus: true });
    }
  }, [responseErrors]);
  useValidation(formContext.formState, formInstance);
  const validatePassword = usePasswordValidation(formInstance, 'password');
  return (
    <Card className="account-card">
      <h2>Create new account</h2>
      <Form
        layout="vertical"
        disabled={isWaitingForServerResponse}
        initialValues={{
          agreement: isAgreeForProcessingData,
        }}
        form={formInstance}
        onFinish={handleSubmit(sendRequest)}
      >
        <FormProvider {...formContext}>
          <InputField
            rules={{
              ...standardRequiredField,
              minLength: 3,
              validate: {
                serverResponse: (value) => !invalidUsernames[value],
              },
            }}
            name="username"
            placeholder="Username"
            maxLength={20}
          />
          <InputField
            rules={{
              ...standardRequiredField,
              pattern: /^\S+@\S+\.\S+$/i,
              validate: {
                serverResponse: (value) => !invalidEmails[value],
              },
            }}
            name="email"
            placeholder="Email address"
          />
          <InputField password rules={{ ...standardRequiredField, minLength: 6 }} name="password" maxLength={40} />
          <InputField
            password
            rules={{ validate: { validatePassword } }}
            name="password-confirm"
            label="Repeat Password"
          />
          <Form.Item name="agreement" valuePropName="checked">
            <Checkbox onChange={({ target: { checked } }) => setAgreeForProcessingData(checked)}>
              I agree to the processing of my personal information
            </Checkbox>
          </Form.Item>
          <Form.Item style={{ marginBottom: 15 }}>
            <Button
              block
              loading={isWaitingForServerResponse}
              iconPosition="end"
              disabled={isSubmitted ? !isValid || !isAgreeForProcessingData : !isAgreeForProcessingData}
              type="primary"
              htmlType="submit"
            >
              Create
            </Button>
          </Form.Item>
        </FormProvider>
      </Form>
      <p style={{ textAlign: 'center' }}>
        Already have an account? <Link to={'/sign-in'}>Sign In.</Link>
      </p>
    </Card>
  );
};

export default SignUpForm;

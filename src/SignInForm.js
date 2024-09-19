import { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { App, Card, Form, Button } from 'antd';
import { useHistory, useLocation, Link, Redirect } from 'react-router-dom';

import InputField, { standardRequiredField, useValidation } from './InputField';
import { actions as storeActions, store } from './reducer';

const useRequest = () => {
  const [isWaitingForServerResponse, setWaitingForServerResponse] = useState(false);
  const { modal } = App.useApp();
  const history = useHistory();
  const location = useLocation();
  return {
    isWaitingForServerResponse,
    sendRequest: (data) => {
      const { email, password } = data;
      setWaitingForServerResponse(true);
      fetch('https://blog.kata.academy/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email, password } }),
      })
        .then((response) => {
          if (!response.ok && response.status != 422) throw new Error('An unknown error occured');
          return response.json();
        })
        .then((data) => {
          const { errors } = data;
          if (errors) {
            const err = new Error('Login error');
            err.messageList = [];
            for (const errInfo of Object.entries(errors)) err.messageList.push(errInfo.join(' '));
            throw err;
          }
          if (!data.user.image) delete data.user.image;
          const { username, image, token } = data.user;
          localStorage.setItem('credentials', JSON.stringify({ username, image, token }));
          storeActions.setCredentials(data.user);
        })
        .then(
          () => {
            const { from } = location.state || {};
            history.push(from || '/');
          },
          (error) => {
            const content =
              error.messageList.length > 0 ? error.messageList.map((msg, idx) => <div key={idx}>{msg}</div>) : null;
            modal.error({
              title: error.message,
              content,
              onOk: () => {
                setWaitingForServerResponse(false);
              },
            });
          }
        );
    },
  };
};

const SignInForm = () => {
  const { credentials = {} } = store.getState();
  const [formInstance] = Form.useForm();
  const formContext = useForm();
  const {
    handleSubmit,
    formState: { isSubmitted, isValid },
  } = formContext;
  const { isWaitingForServerResponse, sendRequest } = useRequest();
  useValidation(formContext.formState, formInstance);
  if (credentials.username && credentials.token)
    return (
      <Form form={formInstance}>
        <Redirect to="/profile" />
      </Form>
    );
  return (
    <Card className="account-card">
      <h2>Sign In</h2>
      <Form
        layout="vertical"
        disabled={isWaitingForServerResponse}
        form={formInstance}
        onFinish={handleSubmit(sendRequest)}
      >
        <FormProvider {...formContext}>
          <InputField
            rules={{
              ...standardRequiredField,
              pattern: /^\S+@\S+\.\S+$/i,
            }}
            name="email"
            placeholder="Email address"
          />
          <InputField password rules={{ ...standardRequiredField }} name="password" maxLength={40} />
          <Form.Item style={{ marginBottom: 15 }}>
            <Button
              block
              loading={isWaitingForServerResponse}
              iconPosition="end"
              disabled={isSubmitted && !isValid}
              type="primary"
              htmlType="submit"
            >
              Login
            </Button>
          </Form.Item>
        </FormProvider>
      </Form>
      <p style={{ textAlign: 'center' }}>
        Don’t have an account? <Link to={'/sign-up'}>Sign Up.</Link>
      </p>
    </Card>
  );
};

export default SignInForm;

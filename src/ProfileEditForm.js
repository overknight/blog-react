import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { CheckCircleTwoTone } from '@ant-design/icons';
import { App, Card, Form, Button } from 'antd';
import { useSelector } from 'react-redux';

import InputField, { standardRequiredField, invalidUsernames, invalidEmails, useValidation } from './InputField';
import { actions as storeActions, store } from './reducer';

let imgValidationPromise,
  imageValidationResult = {};

const preloadImage = (imgUrl) => {
  imgValidationPromise = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(true);
    };
    img.onerror = () => {
      resolve(false);
    };
    img.src = imgUrl;
  });
  return imgValidationPromise;
};

const useRequest = () => {
  const [isWaitingForServerResponse, setWaitingForServerResponse] = useState(false);
  const [responseData, setResponseData] = useState({ errors: {} });
  const { modal } = App.useApp();
  return {
    isWaitingForServerResponse,
    responseErrors: responseData.errors,
    sendRequest: (data) => {
      const { username, email, password, image } = data;
      setWaitingForServerResponse(true);
      const { token } = store.getState().credentials;
      const user = { username, email, password, image: image || null };
      fetch('https://blog.kata.academy/api/user', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      })
        .then((response) => {
          const contentType = response.headers.get('content-type').replace(/^([^ ;]*).*/, '$1');
          if (!response.ok && response.status != 422) throw new Error('Failed to complete request');
          if (contentType == 'application/json') return response.json();
          return response.text();
        })
        .then(
          (responseData) => {
            if (typeof responseData != 'object') responseData = {};
            setResponseData(responseData);
            if (!responseData.errors) {
              storeActions.editCredentials(responseData.user);
              localStorage.setItem('credentials', JSON.stringify({ username, token, image: image || undefined }));
              modal.info({
                title: 'Profile info updated',
                icon: <CheckCircleTwoTone twoToneColor="#2c0" />,
                onOk: () => {
                  setWaitingForServerResponse(false);
                },
              });
            } else setWaitingForServerResponse(false);
          },
          (error) => {
            modal.error({ title: error.message, onOk: () => setWaitingForServerResponse(false) });
          }
        );
    },
    resolveValidationPromise: async () => {
      setWaitingForServerResponse(true);
      const result = await imgValidationPromise;
      setWaitingForServerResponse(false);
      if (!result) setResponseData({ errors: { invalidImageUrl: true } });
      return result;
    },
  };
};

const ProfileEditForm = ({ history, location }) => {
  const { credentials = {} } = store.getState();
  useEffect(() => {
    if (!credentials.username && !credentials.token) history.replace('/sign-in', { from: location.pathname });
  }, [credentials.username, credentials.token]);
  const [formInstance] = Form.useForm();
  const formContext = useForm();
  const {
    handleSubmit,
    trigger,
    setError,
    clearErrors,
    formState: { errors, dirtyFields, isSubmitted, isValid },
  } = formContext;
  const { isWaitingForServerResponse, resolveValidationPromise, sendRequest, responseErrors } =
    useRequest(formInstance);
  useEffect(() => {
    if (!responseErrors) return;
    if (responseErrors.invalidImageUrl) trigger(undefined, { shouldFocus: true });
    if (isSubmitted) {
      if (responseErrors.username) invalidUsernames[formInstance.getFieldValue('username')] = responseErrors.username;
      if (responseErrors.email) invalidEmails[formInstance.getFieldValue('email')] = responseErrors.email;
      const targetFields = Object.keys(responseErrors).filter((fieldName) => fieldName != 'invalidImageUrl');
      if (targetFields.length > 0) {
        setError(targetFields[0], {
          type: 'serverResponse',
        });
        trigger(undefined, { shouldFocus: true });
      }
    }
  }, [responseErrors]);
  useValidation(formContext.formState, formInstance);
  const onImgUrlChange = ({ type: eventType }) => {
    if (eventType == 'change') {
      if (errors.image) {
        clearErrors('image');
        trigger('image');
      }
      return;
    }
    if (dirtyFields.image) {
      trigger('image');
    }
  };
  const email = useSelector((state) => state.credentials.email);
  useEffect(() => {
    if (!email) return;
    formInstance.setFieldValue('email', email);
    formContext.setValue('email', email);
    trigger('email');
  }, [email]);
  return (
    <Card className="account-card">
      <h2>Edit Profile</h2>
      <Form
        layout="vertical"
        disabled={isWaitingForServerResponse}
        initialValues={{
          username: credentials.username,
          email: email,
          image: credentials.image,
        }}
        form={formInstance}
        onFinish={async (data) => {
          const imgUrl = formInstance.getFieldValue('image');
          if (imageValidationResult[imgUrl] === undefined) {
            await resolveValidationPromise();
          }
          handleSubmit(sendRequest)(data);
        }}
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
            defaultValue={credentials.username}
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
            defaultValue={credentials.email}
          />
          <InputField password rules={{ minLength: 6 }} name="password" label="New password" maxLength={40} />
          <InputField
            name="image"
            label="Avatar image (url)"
            placeholder="Avatar image"
            defaultValue={credentials.image}
            onBlur={onImgUrlChange}
            onChange={onImgUrlChange}
            rules={{
              pattern: /^https?:\/\/.*/,
              validate: {
                checkImgUrl: async (value) => {
                  if (!value) {
                    imgValidationPromise = Promise.resolve(true);
                    return true;
                  }
                  let result = imageValidationResult[value];
                  if (result !== undefined) return result;
                  result = await preloadImage(value);
                  imageValidationResult = { [value]: result };
                  return result;
                },
              },
            }}
          />
          <Form.Item style={{ marginBottom: 15 }}>
            <Button
              block
              loading={isWaitingForServerResponse}
              iconPosition="end"
              disabled={isSubmitted && !isValid}
              type="primary"
              htmlType="submit"
            >
              Save
            </Button>
          </Form.Item>
        </FormProvider>
      </Form>
    </Card>
  );
};

export default ProfileEditForm;

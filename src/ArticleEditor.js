import { useState, useEffect } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { Card, Space, Flex, Spin, Form, Input, Button, Alert } from 'antd';
import { useForm, FormProvider, useFormContext, useController } from 'react-hook-form';
import { useLocation, useHistory, useRouteMatch, Redirect } from 'react-router-dom';

import InputField, { standardRequiredField, useValidation } from './InputField';
import { actions as storeActions, store } from './reducer';

let initialValues = null;
let shouldFocusTagField = -1;

const TagInput = ({ name, remove, isLast }) => {
  const { trigger, watch, setValue } = useFormContext();
  const defaultValue = initialValues && initialValues.tagList && initialValues.tagList[name];
  const {
    field,
    fieldState: { error },
  } = useController({ name: `tagList.${name}`, defaultValue, rules: { required: true } });
  const formInstance = Form.useFormInstance();
  const onBlur = (e) => {
    field.onBlur(e);
    trigger(`tagList.${name}`);
  };
  const onChange = (e) => {
    field.onChange(e);
    if (error) {
      trigger(`tagList.${name}`);
    }
  };
  watch(`tagList.${name}`);
  delete field.name;
  const style = isLast ? { marginRight: 10 } : { width: '100%' };
  let autoFocus = false;
  if (shouldFocusTagField == name) {
    autoFocus = true;
    shouldFocusTagField = -1;
  }
  return (
    <Space align="baseline" {...{ style }}>
      <Form.Item {...{ name }}>
        <Input {...{ autoFocus }} placeholder="Tag" {...field} {...{ onBlur, onChange }} />
      </Form.Item>
      <Button
        danger
        style={{ padding: '0 25px' }}
        onClick={() => {
          remove(name);
          setValue('tagList', formInstance.getFieldValue('tagList'));
        }}
      >
        Delete
      </Button>
    </Space>
  );
};

const useRequest = () => {
  const history = useHistory();
  const location = useLocation();
  const {
    params: { slug },
  } = useRouteMatch('/articles/:slug/edit') || { params: {} };
  const isNewArticle = !slug && location.pathname == '/new-article';
  const cachedArticle =
    (!isNewArticle && (store.getState().articles || []).find((articleEnt) => articleEnt.slug == slug)) || null;
  const [articleData, setArticleData] = useState(cachedArticle);
  useEffect(() => {
    if (isNewArticle && articleData) {
      initialValues = null;
      setArticleData(null);
    }
  }, [slug]);
  return {
    slug,
    isNewArticle,
    publishArticle: (data) => {
      const { token } = store.getState().credentials;
      const url = `https://blog.kata.academy/api/articles${isNewArticle ? '' : `/${slug}`}`;
      fetch(url, {
        method: isNewArticle ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: { ...data } }),
      })
        .then((response) => {
          if (response.headers.get('content-type').startsWith('application/json')) return response.json();
          return response.text();
        })
        .then((result) => {
          const { slug } = result.article || { article: {} };
          const articles = store.getState().articles || [];
          const idx = articles.findIndex((ent) => ent.slug == slug);
          if (~idx) storeActions.updateArticle(slug, result.article);
          history.replace(`/articles/${slug}`, { info: { title: `Article ${isNewArticle ? 'created' : 'updated'}` } });
        });
    },
    articleData,
    getArticleData: () => {
      setArticleData(null);
      return fetch(`https://blog.kata.academy/api/articles/${slug}`)
        .then((response) => {
          if (response.status == 404) {
            const err = new Error('Requested resource not found.');
            err.code == response.status;
            throw err;
          }
          if (!response.ok) throw new Error('An unknown error occured');
          if (response.headers.get('content-type').startsWith('application/json')) return response.json();
          return response.text();
        })
        .then(
          (data) => setArticleData(data.article),
          (error) => setArticleData({ error })
        );
    },
  };
};

const ArticleEditor = ({ history }) => {
  const [formInstance] = Form.useForm();
  const formContext = useForm();
  const { handleSubmit } = formContext;
  const { slug, publishArticle, isNewArticle, articleData, getArticleData } = useRequest(formInstance);
  useValidation(formContext.formState, formInstance);
  const isLoadingData = !isNewArticle && !articleData;
  useEffect(() => {
    if (isLoadingData) {
      getArticleData();
    } else {
      const fieldValues = formInstance.getFieldsValue();
      const {
        formState: { errors },
      } = formContext;
      for (const k in fieldValues) {
        const v = isNewArticle ? null : articleData[k];
        fieldValues[k] = v;
        formContext.setValue(k, v);
      }
      if (Object.keys(errors).length > 0) formContext.clearErrors();
      formInstance.setFieldsValue(fieldValues);
    }
  }, [articleData, slug]);
  if (isLoadingData)
    return (
      <Form form={formInstance}>
        <Flex justify="center">
          <Spin
            indicator={
              <LoadingOutlined
                style={{
                  fontSize: 48,
                }}
                spin
              />
            }
          />
        </Flex>
      </Form>
    );
  if (articleData && articleData.error)
    return (
      <Form form={formInstance}>
        <Flex style={{ width: '80%', margin: '0 auto' }} vertical justify="center">
          <Alert
            message={articleData.error.message}
            type="error"
            showIcon
            style={{ padding: '15px 10px', marginBottom: 20 }}
          />
          {articleData.error.code != 404 ? (
            <Button
              size="small"
              type="primary"
              style={{ width: '40%', margin: '0 auto 10px', padding: 15 }}
              onClick={() => getArticleData()}
            >
              Try again
            </Button>
          ) : null}
          <Button
            size="small"
            type={articleData.error.code != 404 ? null : 'primary'}
            style={{ width: '40%', margin: '0 auto', padding: 15 }}
            onClick={() => history.replace('/')}
          >
            Browse articles
          </Button>
        </Flex>
      </Form>
    );
  if (!isNewArticle && articleData && articleData.author.username != store.getState().credentials.username) {
    return (
      <Form form={formInstance}>
        <Redirect
          to={{
            pathname: `/articles/${slug}`,
            state: {
              warning: {
                title: 'Forbidden',
                content: 'You are not author of this article so you can\x27t edit it',
              },
            },
          }}
        />
      </Form>
    );
  }
  if (!isNewArticle && !isLoadingData) {
    initialValues = (({ title, description, body, tagList = [] }) => ({ title, description, body, tagList }))(
      articleData
    );
  }
  return (
    <Card className="article-card">
      <h3 className="editor-header">{isNewArticle ? 'New article' : 'Edit article'}</h3>
      <Form layout="vertical" form={formInstance} onFinish={handleSubmit(publishArticle)} {...{ initialValues }}>
        <FormProvider {...formContext}>
          <InputField
            rules={{ ...standardRequiredField }}
            name="title"
            placeholder="Title"
            defaultValue={isNewArticle ? null : articleData.title}
          />
          <InputField
            rules={{ ...standardRequiredField }}
            name="description"
            label="Short description"
            placeholder="Description"
            defaultValue={isNewArticle ? null : articleData.description}
          />
          <InputField
            multiline
            rules={{ ...standardRequiredField }}
            name="body"
            placeholder="Text"
            defaultValue={isNewArticle ? null : articleData.body}
          />
          <Form.Item label="Tags">
            <Form.List name="tagList">
              {(fields, { add, remove }) => {
                const tags = formInstance.getFieldValue('tagList') || [];
                let allowToAdd = true;
                for (const tagField of tags)
                  if (!tagField) {
                    allowToAdd = false;
                    break;
                  }
                return (
                  <>
                    {fields.map(({ key, name }, idx) => {
                      const isLast = fields.length - 1 == idx;
                      return <TagInput key={key} {...{ name, remove, isLast }} />;
                    })}
                    <Button
                      disabled={!allowToAdd}
                      className="add-tag"
                      onClick={() => {
                        shouldFocusTagField = fields.length;
                        add();
                      }}
                      style={{ padding: '0 25px' }}
                    >
                      Add tag
                    </Button>
                  </>
                );
              }}
            </Form.List>
          </Form.Item>
          <Form.Item>
            <Button style={{ width: '25%' }} iconPosition="end" type="primary" htmlType="submit">
              Send
            </Button>
          </Form.Item>
        </FormProvider>
      </Form>
    </Card>
  );
};

export default ArticleEditor;

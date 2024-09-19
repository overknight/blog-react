import { useState, useEffect } from 'react';
import Markdown from 'markdown-to-jsx';
import { LoadingOutlined, CheckCircleTwoTone } from '@ant-design/icons';
import { App, Card, Spin, Flex, Button, Alert } from 'antd';

import ArticleHeader from './ArticleHeader';
import { actions as storeActions, store } from './reducer';

const ArticlePage = ({
  location,
  history,
  match: {
    params: { slug },
  },
}) => {
  const { modal } = App.useApp();
  const [articleInfo, setArticleInfo] = useState(null);
  useEffect(() => {
    if (location.state && location.state.warning) {
      const { title, content } = location.state.warning;
      modal.warning({ title, content, width: 420 });
      const newHistoryState = { ...location.state };
      delete newHistoryState.warning;
      history.replace(undefined, newHistoryState);
    }
    if (location.state && location.state.info) {
      const { title, content } = location.state.info;
      modal.info({ icon: <CheckCircleTwoTone twoToneColor="#2c0" />, title, content });
      const newHistoryState = { ...location.state };
      delete newHistoryState.info;
      history.replace(undefined, newHistoryState);
    }
    const articles = store.getState().articles || [];
    const cachedArticle = articles.find((articleEnt) => articleEnt.slug == slug);
    if (!cachedArticle)
      fetch(`https://blog.kata.academy/api/articles/${slug}`)
        .then((response) => {
          if (response.status == 404) throw new Error('Requested resource not found');
          if (!response.ok)
            return response.text().then((details) => {
              const err = new Error(details || 'Unknown error');
              return Promise.reject(err);
            });
          return response.json();
        })
        .then(
          (data) => {
            setArticleInfo(data.article);
            storeActions.updateArticle(slug, data.article);
          },
          (error) => {
            setArticleInfo({ error });
          }
        );
    else setArticleInfo(cachedArticle);
  }, []);
  if (!articleInfo)
    return (
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
    );
  if (articleInfo.error)
    return (
      <Flex style={{ width: '80%', margin: '0 auto' }} vertical justify="center">
        <Alert
          message={articleInfo.error.message}
          type="error"
          showIcon
          style={{ padding: '15px 10px', marginBottom: 20 }}
        />
        <Button
          size="small"
          type="primary"
          style={{ width: '40%', margin: '0 auto', padding: 15 }}
          onClick={() => history.replace('/')}
        >
          Browse articles
        </Button>
      </Flex>
    );
  return (
    <Card className="article-card">
      <ArticleHeader {...articleInfo} />
      <Markdown
        options={{
          overrides: {
            h1: {
              component: ({ children }) => <h2 className="article-header">{children}</h2>,
            },
          },
        }}
      >
        {articleInfo.body}
      </Markdown>
    </Card>
  );
};

export default ArticlePage;

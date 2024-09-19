import { useState, useEffect } from 'react';
import { Link, useRouteMatch, useHistory } from 'react-router-dom';
import { UserOutlined, HeartFilled, HeartTwoTone } from '@ant-design/icons';
import { App, Flex, Space, Tag, Avatar, Button, Popconfirm } from 'antd';
import { format as dateFormat } from 'date-fns';
import { useSelector } from 'react-redux';

import { actions as storeActions, store } from './reducer';

const authorName_maxLength = 21;

const getArticle = (slug, state) => {
  const { articles = [] } = state;
  const idx = articles.findIndex((ent) => ent.slug == slug);
  if (idx < 0) return null;
  return articles[idx];
};

const useRequest = (slug) => {
  const { modal } = App.useApp();
  const history = useHistory();
  const match = useRouteMatch('/articles/:slug');
  const [isRemovingArticle, setRemovingArticle] = useState(false);
  return {
    isRemovingArticle,
    removeArticle: () => {
      const { token } = store.getState().credentials;
      setRemovingArticle(true);
      return fetch(`https://blog.kata.academy/api/articles/${slug}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((response) => {
          if (!response.ok) {
            return response.text().then((details) => {
              const err = new Error('Response error');
              Object.assign(err, { details });
              return Promise.reject(err);
            });
          }
          return response.text();
        })
        .then(() => {
          if (match && match.params) {
            const { slug } = match.params;
            if (slug) {
              history.replace('/');
              return;
            }
          }
          const articles = store.getState().articles || [];
          if (~articles.findIndex((ent) => ent.slug == slug)) history.replace(undefined);
        })
        .catch((error) => {
          const { message: title } = error;
          const content = !error.details ? null : (
            <>
              <div>Details:</div>
              <div className="details">{error.details}</div>
            </>
          );
          modal.error({ title, content });
        })
        .finally(() => setRemovingArticle(false));
    },
    toggleFavorite: () => {
      const article = getArticle(slug, store.getState());
      if (!article) return;
      const fallbackValue = { ...article };
      article.favorited = !article.favorited;
      article.favoritesCount += article.favorited;
      storeActions.updateArticle(slug, { ...article });
      const { token } = store.getState().credentials;
      fetch(`https://blog.kata.academy/api/articles/${slug}/favorite`, {
        method: article.favorited ? 'POST' : 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((response) => {
          if (!response.ok) throw new Error('Response error');
          return response.json();
        })
        .then(
          ({ article }) => storeActions.updateArticle(slug, article),
          () => storeActions.updateArticle(slug, fallbackValue)
        );
    },
  };
};

const useImagePreloader = (profileImage) => {
  const [preloadedImage, setPreloadedImage] = useState(null);
  useEffect(() => {
    if (!profileImage) {
      setPreloadedImage(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setPreloadedImage(profileImage);
    };
    img.src = profileImage;
  }, [profileImage]);
  return preloadedImage;
};

const ArticleHeader = ({ tagList, author, slug, title, updatedAt, description }) => {
  const match = useRouteMatch('/articles/:slug') || { params: {} };
  const history = useHistory();
  const preloadedImage = useImagePreloader(author.image);
  const tags = (tagList || []).filter((tag) => (tag || '').length > 0).map((tag, idx) => <Tag key={idx}>{tag}</Tag>);
  const isLoggedIn = useSelector((state) => {
    return Boolean(state.credentials.token && state.credentials.username);
  });
  const isAuthorized = useSelector((state) => {
    if (!isLoggedIn) return false;
    return Boolean(state.credentials.token && state.credentials.username == author.username);
  });
  const { favorited = false, favoritesCount = 0 } = useSelector((state) => {
    const article = getArticle(slug, state) || {};
    return article;
  });
  const { isRemovingArticle, removeArticle, toggleFavorite } = useRequest(slug);
  let { username: authorName } = author;
  if (authorName.length > authorName_maxLength) authorName = authorName.slice(0, authorName_maxLength) + '…';
  return (
    <>
      <div className="title">
        <h2>{match.params.slug == slug ? title : <Link to={`/articles/${slug}`}>{title}</Link>}</h2>
        <button
          disabled={!isLoggedIn}
          type="button"
          className={'btn-fav' + (favorited ? ' active' : '')}
          onClick={toggleFavorite}
        >
          {favorited ? <HeartFilled /> : <HeartTwoTone twoToneColor="#000" />}
          <span>{favoritesCount}</span>
        </button>
      </div>
      <Space align="flex-start" className="details">
        <Flex vertical justify="space-between">
          <div className="author">{authorName}</div>
          <div className="date">{dateFormat(updatedAt, 'MMMM d, yyyy')}</div>
        </Flex>
        <Avatar src={preloadedImage} size={42} icon={<UserOutlined />} />
      </Space>
      {tags.length > 0 ? <div className="tags">{tags}</div> : null}
      <Flex align="center" justify="space-between" className="description-container">
        <p className="description">{description}</p>
        {isAuthorized ? (
          <Space className="article-actions">
            <Popconfirm
              placement="bottom"
              title={'Are you sure to delete this article?'}
              okText="Yes"
              cancelText="No"
              onConfirm={removeArticle}
            >
              <Button danger loading={isRemovingArticle}>
                Delete
              </Button>
            </Popconfirm>
            <Button className="btn-green" onClick={() => history.push(`/articles/${slug}/edit`)}>
              Edit
            </Button>
          </Space>
        ) : null}
      </Flex>
    </>
  );
};

export default ArticleHeader;

import { createStore, applyMiddleware, bindActionCreators } from 'redux';
import { thunk } from 'redux-thunk';

const responseError = Symbol();
const kErrorType = Symbol();

const actionsMap = new Map([
  [
    'LIST_ARTICLES',
    (state, action) => {
      const { articles, articlesCount } = action.payload;
      return Object.assign({}, state, { articles, articlesCount });
    },
  ],
  [
    'ARTICLE_ENTRY_REPLACE',
    (state, action) => {
      const { data, slug } = action;
      const articles = [...(state.articles || [])];
      const idx = articles.findIndex((ent) => ent.slug == slug);
      articles[idx < 0 ? 0 : idx] = data;
      return Object.assign({}, state, { articles });
    },
  ],
  [
    'CREDENTIALS_NEW',
    (state, action) => {
      const { username, email, image, token } = action.payload;
      const credentials = { username, email, image, token };
      const articles = [...(state.articles || [])];
      const isAuthorized = Boolean(username && token);
      if (!isAuthorized) for (const ent of articles) ent.favorited = false;
      return Object.assign({}, state, { credentials, articles });
    },
  ],
  [
    'CREDENTIALS_UPDATE',
    (state, action) => {
      const credentials = { ...state.credentials, ...action.payload };
      return Object.assign({}, state, { credentials });
    },
  ],
]);

const credentials = JSON.parse(localStorage.getItem('credentials') || '{}');

const reducer = (state = { isFetching: true, credentials }, action) => {
  if (actionsMap.has(action.type)) return actionsMap.get(action.type)(state, action);
  return state;
};

export const store = createStore(reducer, applyMiddleware(thunk));

export const actions = bindActionCreators(
  {
    recieveArticles: (pageNumber) => (dispatch, getState) => {
      let offset = 0;
      if (pageNumber > 1) offset = (pageNumber - 1) * 20;
      const { token } = getState().credentials;
      const headers = !token ? {} : { Authorization: `Bearer ${token}` };
      return fetch(`https://blog.kata.academy/api/articles${offset > 0 ? `?offset=${offset}` : ''}`, { headers })
        .then((response) => {
          if (!response.ok) throw { [kErrorType]: responseError, code: response.status };
          return response.json();
        })
        .then(
          (data) => {
            dispatch({ type: 'LIST_ARTICLES', payload: data });
            return data;
          },
          (error) => {
            if (error[kErrorType] === responseError) {
              const codeGroup = Math.floor(error.code / 100);
              if (codeGroup == 4) error.message = `Wrong request (${error.code})`;
              else if (codeGroup == 5) error.message = `Server error (${error.code})`;
              else error.message = `Unknown error (code: ${error.code})`;
            }
            return { error };
          }
        );
    },
    updateArticle: (slug, data) => ({ type: 'ARTICLE_ENTRY_REPLACE', data, slug }),
    setCredentials: (payload) => ({ type: 'CREDENTIALS_NEW', payload }),
    editCredentials: (payload) => ({ type: 'CREDENTIALS_UPDATE', payload }),
  },
  store.dispatch
);

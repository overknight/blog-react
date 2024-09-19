import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { App, ConfigProvider as StyleProvider } from 'antd';

import * as account from './account';
import { actions as storeActions, store } from './reducer';
import Header from './Header';
import ArticlePage from './ArticlePage';
import ArticlesList from './ArticlesList';
import SignUpForm from './SignUpForm';
import SignInForm from './SignInForm';
import ProfileEditForm from './ProfileEditForm';
import ArticleEditor from './ArticleEditor';
import PrivateRoute from './PrivateRoute';

import './style.css';

const theme = {
  token: {
    fontFamily: '"Inter", "system-ui"',
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Provider {...{ store }}>
    <StyleProvider {...{ theme }}>
      <App>
        <Router>
          <Header />
          <Switch>
            <Route path="/sign-up" exact component={SignUpForm} />
            <Route path="/sign-in" exact component={SignInForm} />
            <Route path="/profile" exact component={ProfileEditForm} />
            <PrivateRoute path="/new-article" component={ArticleEditor} />
            <PrivateRoute path="/articles/:slug/edit" component={ArticleEditor} />
            <Route path="/articles/:slug" component={ArticlePage} />
            <Route component={ArticlesList} />
          </Switch>
        </Router>
      </App>
    </StyleProvider>
  </Provider>
);

const { token } = store.getState().credentials;
if (token) {
  account.login(token).then((result) => {
    if (result.unauthorized) {
      storeActions.setCredentials({});
      localStorage.removeItem('credentials');
      return;
    }
    if (typeof result != 'object') result = {};
    const { username, image, email, token } = result.user;
    localStorage.setItem('credentials', JSON.stringify({ username, image, token }));
    storeActions.editCredentials({ username, image, email, token });
  });
}

import { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { UserOutlined } from '@ant-design/icons';
import { Button, Avatar, Space } from 'antd';
import { Link, useHistory } from 'react-router-dom';

import { actions as storeActions } from './reducer';

const useAccountActions = () => {
  const history = useHistory();
  return [
    () => history.push('/sign-up'),
    () => history.push('/sign-in'),
    () => history.push('/new-article'),
    () => history.push('/profile'),
    () => {
      storeActions.setCredentials({});
      localStorage.removeItem('credentials');
    },
  ];
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

const Header = ({ credentials }) => {
  const [onSignUpClick, onSignInClick, onNewArticleClick, onProfileEditClick, onLogoutClick] = useAccountActions();
  const preloadedImage = useImagePreloader(credentials.image);
  return (
    <header>
      <h1>
        <Link to="/">{process.env.REACT_APP_NAME}</Link>
      </h1>
      <div className="btn-group">
        <Space>
          {!credentials.username ? (
            <>
              <Button type="text" onClick={onSignInClick}>
                Sign In
              </Button>
              <Button className="btn-green" onClick={onSignUpClick}>
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <Button className="btn-green" onClick={onNewArticleClick}>
                Create article
              </Button>
              <Button type="text" onClick={onProfileEditClick}>
                <span>{credentials.username}</span>
                <Avatar src={preloadedImage} size={29} icon={<UserOutlined />} />
              </Button>
              <Button onClick={onLogoutClick}>Log Out</Button>
            </>
          )}
        </Space>
      </div>
    </header>
  );
};

export default connect((state) => ({ credentials: state.credentials }))(Header);

import { connect } from 'react-redux';
import { Route, Redirect } from 'react-router-dom';

const useAuth = (credentials = {}) => {
  const { username, token } = credentials;
  return Boolean(username && token);
};

const PrivateRoute = ({ credentials, location, ...props }) => {
  const isAuthorized = useAuth(credentials);
  return (
    <>
      {isAuthorized ? (
        <Route {...props} />
      ) : (
        <Redirect to={{ pathname: '/sign-in', state: { from: location.pathname } }} />
      )}
    </>
  );
};

export default connect((state) => ({ credentials: state.credentials }))(PrivateRoute);

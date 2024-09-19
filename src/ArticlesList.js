import { useEffect, useState } from 'react';
import { Spin, Card, Pagination, Flex, Button, Empty, Alert } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

import ArticleHeader from './ArticleHeader';
import { actions as storeActions } from './reducer';

const dataToView = (articleEnt, idx) => {
  return (
    <Card key={idx}>
      <ArticleHeader {...articleEnt} />
    </Card>
  );
};

const pageNumberFromQuery = (location) => {
  const searchParams = new URLSearchParams(location.search);
  return parseInt(searchParams.get('page')) || 1;
};

const usePaginator = (location, history, callback) => {
  const [pageNumber, setPageNumber] = useState(pageNumberFromQuery(location));
  useEffect(() => {
    setPageNumber(pageNumberFromQuery(location));
    callback();
  }, [location]);
  return [
    pageNumber,
    (selectedPageN) => {
      setPageNumber(selectedPageN);
      history.push(`?page=${selectedPageN}`);
      callback();
    },
  ];
};

const useData = () => {
  const [data, setData] = useState({});
  return [
    data,
    (recievedData) => {
      setData(recievedData);
    },
    () => {
      setData((data) => ({ ...data, loadingPage: true }));
    },
  ];
};

const ArticlesList = ({ location, history }) => {
  const [data, onDataRecieved, selectPageCallback] = useData();
  const [pageNumber, onPageSelect] = usePaginator(location, history, selectPageCallback);
  useEffect(() => {
    storeActions.recieveArticles(pageNumber).then(onDataRecieved);
  }, [pageNumber, location]);
  if (data.error) {
    return (
      <Flex style={{ width: '80%', margin: '0 auto' }} vertical justify="center">
        <Alert message={data.error.message} type="error" showIcon style={{ padding: '15px 10px', marginBottom: 20 }} />
        <Button
          size="small"
          type="primary"
          style={{ width: '40%', margin: '0 auto', padding: 15 }}
          onClick={() => {
            storeActions.recieveArticles(pageNumber).then(onDataRecieved);
          }}
        >
          Try again
        </Button>
      </Flex>
    );
  }
  if (!data.articles || data.loadingPage)
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
  if (!data.articles.length) return <Empty />;
  return (
    <>
      <div className="posts-list">{data.articles.map(dataToView)}</div>
      <Pagination
        align="center"
        current={pageNumber}
        pageSize={20}
        total={data.articlesCount}
        showSizeChanger={false}
        onChange={onPageSelect}
      />
    </>
  );
};

export default ArticlesList;

import { Skeleton } from 'boneyard-js/react';
import React, { useState, useEffect } from 'react';

const useFetch = (url) => {
  const [data, setData] = useState({ title: 'Test Post', content: 'This is a test post.' });
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    setTimeout(() => {
      setData({ title: 'Test Post', content: 'This is a test post.' });
      setIsLoading(false);
    }, 2000);
  }, [url]);
  return { data, isLoading };
};

const BlogCard = ({ data }) => (
  <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '300px' }}>
    <h3 style={{ margin: '0 0 10px 0' }}>{data.title}</h3>
    <p>{data.content}</p>
  </div>
);

export default function BlogPage() {
  const { data, isLoading } = useFetch('/api/post')

  return (
    <Skeleton name="blog-card" loading={isLoading}>
      {data && <BlogCard data={data} />}
    </Skeleton>
  )
}

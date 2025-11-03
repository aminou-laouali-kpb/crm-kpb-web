import React from 'react';

const BaseTemplate = ({ data, children }) => {
  return (
    <div
      className="bg-white rounded-lg shadow-lg mx-auto w-full max-w-[794px]"
      style={{ minHeight: "1123px" }}
    >
      {children}
    </div>
  );
};

export default BaseTemplate;

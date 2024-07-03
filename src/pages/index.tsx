import React, { useState } from "react";
import { InboxOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import {
  message,
  Upload,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Space,
  Select,
  Button,
} from "antd";
import * as xlsx from "xlsx";
import dayjs from "dayjs";
import { useRequest } from "ahooks";

const { Dragger } = Upload;

async function handleReadableStreamAsPDF(readableStream, filename) {
  // 将ReadableStream转换为Blob
  const blob = await new Response(readableStream).blob();

  // 创建一个URL表示这个Blob对象
  const url = URL.createObjectURL(blob);

  // 创建隐藏的可下载链接
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `${dayjs().format()}_${filename}`; // 自定义文件名
  downloadLink.style.display = "none";

  // 将链接添加到DOM中并触发点击事件以开始下载
  document.body.appendChild(downloadLink);
  downloadLink.click();

  // 清理：从DOM中移除链接，并释放创建的URL对象
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

const App: React.FC = () => {
  const [excelList, setExcelList] = useState([]);
  const [pdf, setPdf] = useState(null);
  const [modal, contextHolder] = Modal.useModal();

  const pdfProps: UploadProps = {
    name: "file",
    maxCount: 1,
    multiple: false,
    accept: ".pdf",
    beforeUpload: () => {
      return false;
    },
    onChange(info) {
      const { status } = info.file;
      if (status === "removed") {
        setPdf(null);
      }
      if (status === "done") {
        setPdf(info.file.originFileObj);
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
    onDrop(e) {
      console.log("Dropped files", e.dataTransfer.files);
    },
  };

  function processData(data) {
    const workbook = xlsx.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const result = xlsx.utils.sheet_to_json(worksheet);
    setExcelList(result);
  }

  function readFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const data = e.target.result;
      processData(data);
    };
    reader.readAsArrayBuffer(file);
  }
  const getExcelNameList = () => window.excelNameList || [];
  const options = Object.keys(excelList[0] || {}).map((key) => {
    return {
      label: key,
      value: key,
    };
  });
  const [form] = Form.useForm();

  const { loading, run } = useRequest(
    (data) => {
      return fetch("/api/resetPdf", {
        method: "POST",
        body: data,
      });
    },
    {
      manual: true,
      onSuccess: (res) => {
        console.log(res, "res");
        if (res.status === 200) {
          handleReadableStreamAsPDF(res.body, pdf.name);
        } else {
          message.error(
            "上传失败，可以尝试修改表格列名，PDF 暂时不支持中文水印"
          );
        }
      },
    }
  );

  return (
    <Row gutter={24} style={{ marginTop: "20vh", paddingLeft: "20vw" }}>
      <Col>
        <Dragger
          name="file"
          multiple={false}
          maxCount={1}
          beforeUpload={(file) => {
            const restList = getExcelNameList();
            const isExcel = ["xls", "xlsx", "csv", ...restList].some((type) =>
              file.name.includes(type)
            );
            if (!isExcel) {
              message.error(`${file.name} is not a excel file`);
            }
            // false 不触发自动请求
            return isExcel ? false : Upload.LIST_IGNORE;
          }}
          onChange={(info) => {
            const { status } = info.file;

            if (status === "removed") {
              setExcelList([]);
            }
            if (status === "done") {
              readFile(info.file.originFileObj);
              message.success(`${info.file.name} file uploaded successfully.`);
            } else if (status === "error") {
              message.error(`${info.file.name} file upload failed.`);
            }
          }}
          onDrop={(e) => {
            console.log("Dropped files", e.dataTransfer.files);
          }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">上传 Excel</p>
          <p className="ant-upload-hint">支持点击和拖拽上传</p>
        </Dragger>
      </Col>
      <Col>
        <Dragger {...pdfProps} disabled={excelList.length === 0}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">上传 PDF</p>
          <p className="ant-upload-hint">支持点击和拖拽上传</p>
        </Dragger>
      </Col>

      {excelList.length > 0 && (
        <Col>
          <Form form={form} name="validateOnly" autoComplete="off">
            <Form.Item
              name="columnName"
              label="表格列名"
              initialValue={options[0]?.value}
              required
            >
              <Select options={options} />
            </Form.Item>
            <Form.Item name="x" label="水印 x 轴" initialValue={20}>
              <Input />
            </Form.Item>
            <Form.Item name="y" label="水印 y 轴" initialValue={20}>
              <Input />
            </Form.Item>
            <Form.Item name="size" label="水印文字大小" initialValue={12}>
              <Input />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                loading={loading}
                disabled={!pdf}
                onClick={() => {
                  form.validateFields().then(({ size, x, y, columnName }) => {
                    const formData = new FormData();
                    const columnList = excelList.map(
                      (item) => item[columnName]
                    );
                    formData.append("pdf", pdf);
                    formData.append("size", size);
                    formData.append("x", x);
                    formData.append("y", y);
                    formData.append("list", JSON.stringify(columnList || []));

                    run(formData);
                  });
                }}
              >
                PDF 添加水印
              </Button>
            </Form.Item>
          </Form>
        </Col>
      )}
    </Row>
  );
};

export default App;

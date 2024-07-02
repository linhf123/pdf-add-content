import type { UmiApiRequest, UmiApiResponse } from 'umi';
import { parseMultipart } from 'umi';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

// import xlsx from 'node-xlsx';
// import { readFile } from 'fs/promises';

// // excel文件类径
// const excelFilePath = './a1_50.csv'

// //解析excel, 获取到所有sheets
// const sheets = xlsx.parse(excelFilePath);

// // 查看页面数
// console.log(sheets.length);

// // 打印页面信息..
// const sheet = sheets[0];
// console.log(sheet);

// // 打印页面数据
// console.log(sheet.data);

// // 输出每行的第二个内容
// const numberList = sheet.data.map(row => {
//   return row[1]
//   // 数组格式, 根据不同的索引取数据
// })
// console.log(numberList, 'numberList');

async function readAndSavePdf(fileBuffer, { x, y, size, list = [] } = {}) {
  // 使用promises API异步读取PDF文件的Buffer
  // const fileBuffer = await readFile(filePath);

  // 加载PDF文档
  const pdfDoc = await PDFDocument.load(fileBuffer);

  // 打印PDF的页数以确认加载成功
  console.log(`PDF has ${pdfDoc.getPageCount()} pages.`);

  const pages = pdfDoc.getPages()

  pages.map((page, index) => {
    // 添加或修改文本为例
    page.drawText(list?.[index] || '', { x: Number(x ?? 20), y: Number(y ?? 20), size: Number(size ?? 12) });
  })

  // 保存PDF到新的文件，这里不做任何修改，直接保存
  const pdfBytes = await pdfDoc.save();

  // 指定输出文件路径
  const outputFilePath = './output.pdf';

  // 写入文件系统
  // await fs.promises.writeFile(outputFilePath, pdfBytes);
  // console.log('PDF saved successfully to:', outputFilePath);
  return pdfBytes
}

// // 调用函数并传入PDF文件路径
// const filePath = './a1_50.pdf';
// readAndSavePdf(filePath).catch(error => {
//   console.error('Error occurred:', error);
// });

export default async function async(req: UmiApiRequest, res: UmiApiResponse) {
  const { pdf, list, ...rest } = req.body || {}

  try {
    if (pdf) {
      // console.log(Object.prototype.toString.call(pdf), Object.prototype.toString.call(pdf.data), 'fasdfasdf')
      const modifiedPdf = await readAndSavePdf(pdf.data || '', { list: JSON.parse(list || '[]'), ...rest })
      res.header('Content-Type', 'application/pdf').header('Content-Disposition', 'attachment; filename="output.pdf"').status(200).end(modifiedPdf)
    }
  } catch {
    res.status(500).json({ error: '上传失败' })
  }

}
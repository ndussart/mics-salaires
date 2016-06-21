"use strict"

var inspect = require('eyes').inspector({maxLength:20000})
var pdf_extract = require('pdf-extract')
var PDFMerge = require('pdf-merge')

if (!process.argv[2]){
  console.log("Missing file_name");
  process.exit(1);
}

var absolute_path_to_pdf = process.argv[2]
var options = {
  type: 'text'  // extract the actual text in the pdf file
}

var processor = pdf_extract(absolute_path_to_pdf, options, function(err) {
  if (err) {
    return console.log(err)
  }
})

processor.on('complete', function(data) {
  let pageCount = 1
  data.text_pages.forEach((page) => {
    let pageNumbers = page.match(/Page.([\d]+).\/.([\d]+)/)
    let employee = page.match(/collective.:([\s\S]+)Emploi.:/)
    let dates = page.match(/Période.du.:.([\d]+\/[\d]+\/[\d]+)/)
    if (!employee || !dates || employee.length !== 2 || dates.length !== 2){
      console.log("Something is wrong with regexps")
      console.log(`employee = ${employee}`);
      console.log(`dates = ${dates}`);
      process.exit(1);
    }else{
      let employeeName = employee[1].replace(/\n/g,"").trim()
      let pageNumber = 1
      if (pageNumbers){
        pageNumber = pageNumbers[1]
      }
      let totalPage = 1
      if (pageNumbers){
        totalPage = pageNumbers[2]
      }

      let date = dates[1]

      if (pageNumber === totalPage){
        let pages = []
        for (let i=totalPage-1; i>=0; i--){
          pages.push(data.single_page_pdf_file_paths[pageCount - 1 - i])
        }
        let pdfMerge = new PDFMerge(pages)
        let dateSplit = date.split("/")
        let month = dateSplit[1]
        let year = dateSplit[2]
        let fileName = `${year}-${month}-${employeeName}.pdf`.replace(/\s/g,"_").replace(/\//g,"-")
        pdfMerge.asNewFile(fileName).merge(function(error, filePath) {
          if (error){
            console.log("Cannot create pdf file");
            console.log(error);
          } else {
            console.log(`Pdf file ${filePath} created`);
          }
        });
      }
      pageCount++
    }
  })
})
processor.on('error', function(err) {
  inspect(err, 'error while extracting pages')
  return console.log(err)
})

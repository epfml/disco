/**
 * Check the functions parameters
 * @param {File} file the file uploaded by the user
 * @param {Array} headers a map between the expected header and the user's header takes the form: {id: ""; userHeader: ""}
 * @returns
 */
export async function checkData(file, headers) {
  var content = file.target.result;
  var userHeader = content
    .split('\n')
    .shift()
    .split(','); // user's header array
  userHeader = userHeader.map(element => {
    return element.replace('/\r?\n|\r/', '').replace(/\s/g, '');
  });

  // Replace potential special characters added by user's OS system
  userHeader = userHeader.map(element => {
    return element.replace('/\r?\n|\r/', '').replace(/\s/g, '');
  });

  var length = userHeader.length;
  if (length != 0) {
    // Check last column element, if empty then accept
    var lastElement = JSON.stringify(userHeader[userHeader.length - 1]);
    if (lastElement.replace('/\r?\n|\r/', '').replace(/\s/g, '') == '') {
      length = length - 1;
    }
  }
  var checkHeaderLength = length == headers.length; // Check that the user's file has the right number of columns

  if (!checkHeaderLength) {
    alert(
      'Training aborted. The uploaded file has the wrong number of columns.'
    );
  }

  // Check that the user's file and what has been translated as content is correct
  var checkHeaderContent = true;
  var wrongRow = '';
  var numberWrong = 0;
  var headerCopied = [];
  if (checkHeaderLength) {
    headers.forEach(row => {
      checkHeaderContent =
        checkHeaderContent && userHeader.includes(row.userHeader);
      headerCopied.push(row.userHeader);
      if (!userHeader.includes(row.userHeader)) {
        wrongRow = wrongRow.concat('\n'.concat(row.userHeader));
        ++numberWrong;
      }
    });
    if (!checkHeaderContent) {
      if (numberWrong == 1) {
        alert(
          'Training aborted. The following column name was not found in the uploaded file: '.concat(
            wrongRow
          )
        );
      } else {
        alert(
          'Training aborted. The following columns name were not found in the uploaded file: '.concat(
            wrongRow
          )
        );
      }
    }
  }
  return {
    userHeader: headerCopied,
    accepted: checkHeaderLength && checkHeaderContent,
  };
}

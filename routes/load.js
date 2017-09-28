var express = require('express');
var router = express.Router();
var formidable = require('formidable');

var fs = require('fs');
var path = require('path');

var FilePath = path.join(__dirname, '../files');

router.post('/upload', function(req, res, next) {

    var form = new formidable.IncomingForm();
    form.uploadDir = path.join(__dirname, '../tmp');
    form.maxFieldsSize = 10 * 1024 * 1024;
    form.keepExtensions = true;

    function parse() {
        form.parse(req, function(err, fields, file) {
            if (err) throw err;

            var _filename = file.file.name;
            var targetPath = path.join(FilePath, file.file.name);
            var sourcePath = file.file.path;
            fs.rename(sourcePath, targetPath, function(err) {
                if (err) throw err;

                res.status(200).send({
                    success: 0,
                    msg: 'upload success',
                });
            })
        });
    }

    fs.access(FilePath, function(err) {
        if (err) {
            fs.mkdirSync(FilePath);
        }
        parse();
    });
});

router.get('/download/:name', function(req, res, next) {
    var filename = req.params.name;
    var filePath = path.join(FilePath, filename);
    var fileStat = fs.statSync(filePath);
    if (fileStat.isFile()) {
        res.set({
            'Content-Type': 'application/octet-stream;charset=utf-8',
            'Content-Disposition': 'attachment; filename=' + encodeURI(filename), // 含中文需转码
            'Content-Length': fileStat.size,
        });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.send('404');
    }
});

router.get('/files', function(req, res, next) {
    fs.readdir(FilePath, function(err, results) {
        if (err) {
            return res.status(500).send({
                success: 1,
                msg: 'something wrong happens',
                files: [],
            });
        } else {
            var files = [];
            if (results.length > 0) {
                results.forEach(function(file) {
                    if (fs.statSync(path.join(FilePath, file)).isFile() && !(/(^|\/)\.[^\/\.]/g).test(file)) {
                        files.push(file);
                    }
                });
            }
            return res.status(200).send({
                success: 0,
                msg: 'success',
                files: files,
            });
        }
    });
});

module.exports = router;
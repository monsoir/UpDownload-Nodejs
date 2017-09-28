# 上传下载服务器 Node.js

使用 Node.js 实现一个支持上传下载的服务器小程序

开发环境：

Visual Studio Code Version 1.16.1 (1.16.1)

Node.js v8.5.0

## 创建 express

1. 安装 express, 这里进行全局安装，方便以后建立其他 express 项目

    ```sh
    npm install express-generator -g
    ```

2. 使用 express 命令创建一个服务器程序的框架

    ```sh
    express up-download
    ```
    
    express 程序生成后，项目的目录结构为
    
    ![](https://ws2.sinaimg.cn/large/006tKfTcgy1fjwyso9j9lj30ii0l4wfn.jpg)
    
3. 安装依赖

    查看 package.json 文件，内容类似为
    
    ```json
    {
      "name": "up-download",
      "version": "0.0.0",
      "private": true,
      "scripts": {
        "start": "node ./bin/www"
      },
      "dependencies": {
        "body-parser": "~1.17.1",
        "cookie-parser": "~1.4.3",
        "debug": "~2.6.3",
        "express": "~4.15.2",
        "jade": "~1.11.0",
        "morgan": "~1.8.1",
        "serve-favicon": "~2.4.2"
      }
    }
    ```
    
    随后，在 package.json 所在的文件夹中，运行命令安装这些依赖
    
    ```sh
    npm install
    ```

4. 配置 vscode 运行这个 express 程序的调试配置

    在根目录中添加文件夹及文件 .vscode/launch.json, 在文件中添加以下内容，这些配置在我们调试程序的时候非常有用

    ```json
    {
        "version": "0.2.0",
        "configurations": [
            {
                "type": "node",
                "request": "attach",
                "name": "Attach",
                "port": 5858
            },
            {
                "type": "node",
                "request": "launch",
                "name": "Launch Program",
                "program": "${workspaceRoot}/app.js"
            }
        ]
    }
    ```
    
    有一点需要注意的是，configurations 中的数组中的 2nd 元素的 program 项，我从原来的 `${workspaceRoot}/bin/www` 修改为了 `${workspaceRoot}/app.js`, 即修改了程序入口，因为 www 脚本中有较多的配置，这里集中精力在上传下载功能的实现，不纠结这些了
    
    > 其实 .vscode/launch.json 文件，当我们在 vscode 中按下 ⌘ + ⇧ + D, 选择 add configurations 的时候就会自动创建
    
5. 修改 package.json scripts 脚本

    由于修改了程序入口，package.json 中的 scripts 也理论上也需要进行相应的修改
    
    修改前
    
    ```json
    "scripts": {
        "start": "node ./bin/www"
    },
    ```
    
    修改后
    
    ```json
    "scripts": {
        "start": "node ./app.js"
    },
    ```

## 改造 app.js

由于修改了程序入口，所以 app.js 也需要作出相应的修改

1. 引入 http 模块，由于原来的模版中，http 模块是在 www 脚本中引入并创建一个 http 服务器，但现在废弃了 www 脚本的使用，需要我们自己在 app.js 中引入并创建一个 http 服务器

    ```js
    // app.js
    
    // 引入 http 模块
    var http = require('http');
    
    // 在 app.js 的最后，创建一个 http 服务器
    var PORT = 3000;
    var server = http.createServer(app);
    server.listen(3000, function() {
      console.log(`listening at http:127.0.0.1:${PORT}`);
    });
    ```

    这里创建的 http 服务器写死了监听端口 3000

2. 将关于模版的代码去掉，由于这里写的只是针对移动端的 RESTful api, 所以模版对我们并没有什么用，并且在运行的时候可能会出错

3. 去掉默认的 index 与 user 的两个路由，这个程序并不需要用户验证之类的东西

于是，app.js 最后变成了

```js
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var router = require('express').Router();
var http = require('http');

var app = express();

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/api', require('./routes/load'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  return res.send('404');
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  return res.send('internal server error');
});

var PORT = 3000;
var server = http.createServer(app);
server.listen(3000, function() {
  console.log(`listening at http:127.0.0.1:${PORT}`);
});

// module.exports = app;

```

但是，还有一点，就是我们使用了 Router

在最上面的 require 部分，我们引入了 express 中的 Router。使用 Router, 我们可以让路由也实现模块化

```js
var router = require('express').Router();

app.use('/api', require('./routes/load'));
```

像上面的代码，当 url 中识别到 "/api" 的时候，就会自动转到 ./routes/load 这个脚本中执行了

## 编写 load

在这个 load 中，我们包含了上传文件，下载文件，以及查看文件列表的功能

在 ./routes 中添加文件 load.js, 这个文件，就包含了这整个程序的核心功能了

1. 引入路由模块

    ```js
    var express = require('express');
    var router = express.Router();
    ```
    
    这两行代码，其实是为了引入 Router 而已

2. 引入文件模块

    ```js
    var fs = require('fs');
    var path = require('path');
    ```
    
    由于程序与文件相关，所以与文件系统交互的模块是肯定少不了了
    
    - `fs`用于在文件系统中读取文件，写文件
    - `path` 用于拼接文件路径

3. 定义一个常量，这个常量是我们文件的存放路径

    ```js
    var FilePath = path.join(__dirname, '../files');
    ```

4. 定义上传，下载，检索文件的路由

    ```js
    // 上传
    router.post('/upload', function(req, res, next) {
        // ...
    }
    
    // 下载
    router.get('/download/:name', function(req, res, next) {
        // ...
    }
    
    // 检索文件
    router.get('/files', function(req, res, next) {
        // ...
    }
    ```
    
### 检索文件

```js
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
```

当我们向这个路由进行请求的时候，URL 的样子应该为 `http://127.0.0.1/api/files`

1. 调用 `fs` 的异步读取文件列表的方法，读取的路径就是之前定义的常量 `FilePath`, 所以，在此之前，我们需要在根目录下创建一个文件夹 files
2. 在异步回调中，判断是否有错误生成，若有则返回一个 500 的状态码，表示服务器内部错误，并返回一个 json

    > 对于普通的的相应，这个程序都会遵守一个响应格式，即
    > 
    > {
    >     success: ?, 0 表示成功，1 表示其他错误
    >     msg: 对错误的进一步描述
    >     files: 文件名称列表
    > }

3. 当没有错误时，我们首先要检验一下 results 中时候有结果，results 中包含的就是文件的名称了

    > 这里检验 results.length 是必要的，之前以为即使 results 为空，forEach 循环也足够用了，为空就提前返回了，但是结果并不是这样，会发生奇怪的错误

4. 程序只需要返回非隐藏的文件，对 results 的循环中
    - 判断当前的数据是不是一个文件
    - 若当前的数据是一个文件，判断这个文件是不是隐藏文件

### 下载

```js
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
```

当我们向这个路由进行请求的时候，URL 的样子应该为 `http://127.0.0.1/api/download/aFileName`

这里的重点就是设置好响应的头部

```
'Content-Type': 'application/octet-stream;charset=utf-8',
'Content-Disposition': 'attachment; filename=' + encodeURI(filename), // 含中文需转码
'Content-Length': fileStat.size,
```

需要注意的是，我们需要对 filename 文件名的值进行转码，如果文件名出现了中文名，也会出现奇怪的错误了

### 上传

```js
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
```

当我们向这个路由进行请求的时候，URL 的样子应该为 `http://127.0.0.1/api/upload`

对于上传的功能，依赖了第三方的模块 formidable 来实现，因此，我们首先要安装这个模块

```sh
npm i -S formidable
```

安装完成之后，需要在 load.js 中引入这个模块

```js
var formidable = require('formidable');
```

1. 在代码中，我们创建了一个 `formidable.IncomingForm`, 就是这个类负责操作客户端上传过来的数据
2. `form.uploadDir` 定义了一个暂时存放上传数据的地方，这个文件夹指定为根目录下的 tmp, 因此我们需要现在根目录下创建一个文件夹 tmp
    
    > 为什么需要一个暂存上传数据的文件夹？
    > 我忘了曾经在哪里看到过这样的一条回答：确保文件操作的原子性。
    >
    > 上传的数据暂时来说是不安全的，因此需要一个临时的地方存储，等全部数据接收完成后，我们再一次性将这个文件转移到安全的地方，确保了文件数据的完整性
    >
    > 同时，上传数据的时候，并不能确保上传一定成功，对于失败的上传，可能会有垃圾数据产生，于是，我们可以对这个临时区域进行清理

3. `form.maxFieldsSize` 限制了上传文件的大小
4. `form.keepExtensions` 是否保留文件的后缀名
5. 接收数据前，先检验一下保存文件的文件夹是否存在，不存在，先建立一个

    ```js
    fs.access(FilePath, function(err) {
        if (err) {
            fs.mkdirSync(FilePath);
        }
        parse();
    });
    ```

6. 同时，在这个路由的响应方法中，我们还定义了一个内部的函数 `parse()`，这个函数就是接收并处理上传数据的核心了

    在回调方法中，接收了 3 个参数
    
    - `err` 错误
    - `fields` 除文件数据外的其他数据
        
        > 上传文件时，通常采用的是 POST 方法，POST 方法中，我们发送一些类似键值对的数据
        >
        > 在这里，我们可以发送文件的名称 `filename="the file.pdf"`, 就可以通过 fileds.filename 中获取到 `the file.pdf`
    
    - `file` 包含了上传数据接收完成后的文件数据

7. 最后，我们还需要将暂存区域的数据移动到 files 中，通过 `fs.rename` 方法进行文件移动

## 运行

要运行起这个程序，可以通过 vscode 的 debug 模式运行起来，也可以通过 `node app.js` 运行，但是，这并不是发布模式下的运行

## References

- [https://itbilu.com/nodejs/core/Nkvh9yS4W.html](https://itbilu.com/nodejs/core/Nkvh9yS4W.html)
- [https://itbilu.com/nodejs/npm/41vWPhuEb.html](https://itbilu.com/nodejs/npm/41vWPhuEb.html)
- [https://itbilu.com/nodejs/npm/NkGKcF14.html](https://itbilu.com/nodejs/npm/NkGKcF14.html)



const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const multipartry = require('multiparty'); //Multiparty是用来解析FormData数据的一款插件，也可以生成唯一名字
const SparkMD5 = require('spark-md5'); //根据文件内容 用来生成唯一文件名
const path = require('path');
const app = express();
const PORT = 8888;
const HOST = 'http://127.0.0.1';
const HOSTNAME = `${HOST}:${PORT}`;
const FONTHOSTNAME = `${HOST}:${8888}`; // 前端起的服务

//是指静态资源目录
// app.use(express.static(__dirname + '/upload'));
app.use('/upload',express.static(__dirname +'/upload'));


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    req.method === 'OPITIONS'
        ? res.send('CURRENT SERVERICES SUPPORT CROSS DOMAIN REQUEST!')
        : next();
});

//post请求限定大小 
app.use(
    bodyParser.urlencoded({
        extended: false,
        limit: '1024mb',
    })
);

// 延迟函数
const delay = function (interval) {
    typeof interval !== 'number' ? interval === 1000 : interval;
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

// 基于multiparty插件实现文件上传处理 & form-data解析
const uploadDir = `${__dirname}/upload`;
// const baseDir = path.resolve(__dirname, '../');
const baseDir = path.resolve(__dirname, './');

//multipartry解析formdata数据，是否自动处理上传 auto
const multipartry_load = function (req, auto) {
    typeof auto !== 'boolean' ? (auto = false) : null;
    //处理图片的大小上线
    let config = {
        maxFieldsSize: 200 * 1024 * 1024,
    };
    //如果是自动上传
    if (auto) config.uploadDir = uploadDir;
    return new Promise(async (resolve, reject) => {
        await delay(); //
        // 用来将客户端formData 结果解析
        new multipartry.Form(config).parse(req, (err, fields, files) => {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                fields,
                files,
            });
        });
    });
};

// 检测文件是否已经存在
const exists = function (path) {
    return new Promise((resolve) => {
        fs.access(path, fs.constants.F_OK, (err) => {
            if (err) resolve(false);
            return resolve(true);
        });
    });
};

// 创建文件并写入到指定的目录 & 返回客户端结果
const writeFile = function (res, path, file, filename, stream) {
  // console.log('path: ', path);
  // console.log('file: ', file);
    return new Promise((resolve, reject) => {
        if (stream) {
          //创建可读流，可写流，生成文件
          try{
            let readStream = fs.createReadStream(file.path);
            let writeStream = fs.createWriteStream(path);
            readStream.pipe(writeStream);
            readStream.on('end',()=>{
              resolve({
                code: 0,
                codeText: '上传成功',
              });
              //同步地删除文件或符号链接
              // fs.unlinkSync(file.path);
              res.send({
                code: 0,
                codeText: '上传成功',
              });
            });
            }catch(err){
              resolve({
                code: 1,
                codeText: err,
              })
              res.send({
                code: 1,
                codeText: err,
            });
            }
            return
          }
        fs.writeFile(path, file, (err) => {
          console.log('写入文件')
            if (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err,
                });
                return;
            }
           
            resolve();
            res.send({
              code: 0,
              codeText: '上传成功',
              filename: filename,
              url: path.replace(baseDir, FONTHOSTNAME),
          });
        });
    }).catch(()=>{});
};


// 大文件上传 & 合并切片
const merge = (HASH, count) => {
    return new Promise( async (resolve, reject) => {
        let path = `${uploadDir}/${HASH}`
        let fileList = []
        let suffix
        let isExists = await exists(path); // 判断文件是否存在
        if(!isExists) {
            rject('HASH path  is not found!')
            return
        }
        fileList = fs.readdirSync(path);
        if (fileList.length < count) {
            reject('the slice has not been uploaded!')
            return
        }
        fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        }).forEach(item => {
            !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null // 处理文件后缀
            //合成文件
            fs.appendFileSync(`${uploadDir}/${HASH}.${suffix}`, fs.readFileSync(`${path}/${item}`));
            fs.unlinkSync(`${path}/${item}`);
        })
        fs.rmdirSync(path) // 删除临时文件夹
        resolve({
            path: `${uploadDir}/${HASH}.${suffix}`,
            filename: `${HASH}.${suffix}`
        })
    })
}

app.post('/upload_single', async (req, res) => {
    try {
        let { files, fields } = await multipartry_load(req, true);
        let file = (files.file && files.file[0]) || {};
        res.send({
            code: 0,
            codeText: '上传成功',
            originFilename: file.originFilename,
            url: file.path.replace(baseDir, FONTHOSTNAME),
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err,
        });
    }
});

//单文件上传处理base64
app.post('/upload_single_base64', async (req, res) => {
    let file = req.body.file;
    let filename = req.body.filename;
    let spark = new SparkMD5.ArrayBuffer(); // 根据文件内容,生成一个hash名字
    let suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1];  //后缀名
    let isExists = false;
    let path;
    file = decodeURIComponent(file);
    file = file.replace(/^data:image\/\w+;base64,/, '');  //获取真正的文件内容
    file = Buffer.from(file, 'base64'); // 将base64转成正常的文件格式
    // console.log('file:123 ', file);
    spark.append(file);
    path = `${uploadDir}/${spark.end()}.${suffix}`;
    await delay();
    // 检测是否存在
    isExists = await exists(path);
    if (isExists) {
        res.send({
            code: 0,
            codeText: 'file is exists',
            urlname: filename,
            url: path.replace(baseDir, FONTHOSTNAME),
        });
        return;
    }
    // fs.writeFile(res)
    writeFile(res, path, file, filename, false);
});

//处理缩略图接口
app.post('/upload_single_name', async (req, res) => {
    try {
        let { fields, files } = await multipartry_load(req);
        let file = (files.file && files.file[0]) || {};
        // console.log('file:321 ', file);
        let filename = (fields.filename && fields.filename[0]) || '';
        let path = `${uploadDir}/${filename}`;
        let isExists = false;
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                url: path.replace(baseDir, FONTHOSTNAME),
            });
            return;
        }
        //写入文件

        await writeFile(res, path, file, filename, true);
    } catch (e) {
        res.send({
            code: 1,
            codeText: e,
        });
    }
});

/**
 * 上传切片
 */
app.post('/upload_chunk', async (req, res) => {
    try {
        const { fields, files } = await multipartry_load(req);
        const file = (files.file && files.file[0]) || {};
        const filename = (fields.filename && fields.filename[0]) || '';
        // const path = `${uploadDir}/${filename}`
        let isExists = false;
        // 创建存放切片的临时目录
        const [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
        let path = `${uploadDir}/${HASH}`; // 用hash生成一个临时文件夹
        !fs.existsSync(path) ? fs.mkdirSync(path) : null; // 判断该文件夹是否存在，不存在的话，新建一个文件夹
        path = `${uploadDir}/${HASH}/${filename}`; // 将切片存到临时目录中
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is already exists',
                url: path.replace(FONTHOSTNAME, HOSTNAME),
            });
            return;
        }
        writeFile(res, path, file, filename, true);
    } catch (e) {
        res.send({
            code: 1,
            codeText: e,
        });
    }
});

/**
 * 合并切片
 */
app.post('/upload_merge', async (req, res) => {
    const { HASH, count } = req.body;
    try {
        const { filname, path } = await merge(HASH, count);
        res.send({
            code: 0,
            codeText: 'merge sucessfully',
            url: path.replace(baseDir, FONTHOSTNAME),
        });
    } catch (e) {
        res.send({
            code: 1,
            codeText: e,
        });
    }
});


app.post('/upload_already', async (req, res) => {
    let { HASH } = req.body
    let path = `${uploadDir}/${HASH}`
    let fileList = []
    try {
        fileList = fs.readdirSync(path)
        fileList = fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1]
        })
        res.send({
            code: 0,
            codeText: '',
            fileList
        })
    } catch (e) {
        res.send({
            code: 1,
            codeText: e,
            fileList: []
        })
    }
})

//测试
app.use((req,res) => {
  res.send('hello world') 
})


app.listen(PORT, () => {
  console.log(`serve is runnig at ${HOSTNAME}`);
});
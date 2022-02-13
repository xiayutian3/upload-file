// 基于form-data 
(function () {
  let upload = document.querySelector('#upload1');
  let upload_input = upload.querySelector('.upload_ipt');
  let upload_button_select = upload.querySelector('.upload_button.select');
  let upload_button_upload = upload.querySelector('.upload_button.upload');
  let upload_tip = upload.querySelector('.upload_tip');
  let upload_list = upload.querySelector('.upload_list');

  let _file = null; // 初始化文件

  //移除的函数
  const clearFile = () => {
    upload_list.innerHTML = '';
    upload_tip.style.display = 'block';
    _file = null;
  }
  // 移除按钮
  upload_list.addEventListener('click', function (e) {
    let target = e.target;
    // 事件委托, 提高页面性能
    if (target.tagName === 'EM') {
      // 点击的是移除按钮

      // upload_list.innerHTML = '';
      // upload_tip.style.display = 'block';
      // _file = null;
      clearFile()
    }
  });

  // 监听用户选择文件的操作
  upload_input.addEventListener('change', function () {
    // 获取用户选择的文件
    console.log(upload_input.files, '???');
    let file = upload_input.files[0];
    /**
     * + name 文件名
     * + size 文件大小 B字节
     * + type 文件类型
     */
    if (!file) return;
    // 方案1: 限制文件上传的格式
    if (!/(png|jpg|jpeg)/i.test(file.type)) {
      alert('上传文件格式不正确');
    }
    // 限制文件上传的大小
    if (file.size > 2 * 1024 * 1024) {
      alert('上传文件不能超过2MB');
      return;
    }
    upload_tip.style.display = 'none';
    upload_list.innerHTML = `
            <li>
                <span>文件: ${file.name}</span>
                <span><em>移除</em></span>
            </li>
        `;
    _file = file;
    // console.log(file)
    // 事件委托,依托事件冒泡机制
  });

  // 点击文件选择按钮,触发上传文件的行为
  upload_button_select.addEventListener('click', function () {
    upload_input.click();
  });

  // 点击上传文件到服务器
  upload_button_upload.addEventListener('click', function () {
    console.log(_file);
    if (!_file) {
      return alert('请您先选择上传的文件');
    }

    // 将文件传给服务器 FormData / base64
    let formData = new FormData();
    formData.append('file', _file);
    formData.append('filename', _file.name);
    instance
      .post('/upload_single', formData)
      .then((res) => {
        const { code } = res;
        if (code === 0) {
          alert(`file 上传成功,地址是${res.url}`);
          // //不管成功还是失败都要移除上传的文件
          // clearFile()
          return;
        }
        console.log(res);
        return Promise.reject(data.codeText);
      })
      .catch((e) => {
        console.log(e);
      }).finally(() => {
        //不管成功还是失败都要移除上传的文件
        clearFile()
      });

  });

})();


/**
 * base64
 */

(function () {
  let upload = document.querySelector('#upload2');
  let upload_input = upload.querySelector('.upload_ipt');
  let upload_button_select = upload.querySelector('.upload_button.select');

  //转化成base64编码
  const changeBase64 = (file) => {
    return new Promise((resolve) => {
      let fileReader = new FileReader();
      fileReader.readAsDataURL(file); //还可以转成buffer等，但目前我们只是需要转成base64 ，用readAsDataURL即可
      fileReader.onload = (e) => {
        resolve(e.target.result);
      };
    });
  };
  // 监听用户选择文件的操作
  upload_input.addEventListener('change', async function () {
    // 获取用户选择的文件
    console.log(upload_input.files, '???');
    let file = upload_input.files[0];
    let base64 = null;
    /**
     * + name 文件名
     * + size 文件大小 B字节
     * + type 文件类型
     */
    if (!file) return;
    // 方案1: 限制文件上传的格式
    if (!/(png|jpg|jpeg)/i.test(file.type)) {
      alert('上传文件格式不正确');
    }
    // 限制文件上传的大小
    if (file.size > 2 * 1024 * 1024) {
      alert('上传文件不能超过2MB');
      return;
    }

    // 将上传的文件转成base64
    base64 = await changeBase64(file);
    upload_input.value = '';
    // console.log(base64);
    try {
      const data = await instance.post(
        '/upload_single_base64',
        {
          file: encodeURIComponent(base64), // 防止乱码问题
          filename: file.name,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { code } = data;
      if (code === 0) {
        alert('文件上传成功!');
      }
      throw data.codeText; // 抛出异常
    } catch (e) {
      // 文件上传错误
    } finally {
      //
    }
  });

  // 点击文件选择按钮,触发上传文件的行为
  upload_button_select.addEventListener('click', function () {
    upload_input.click();
  });
})();

/**
 * 缩略图方式
 */
 (function () {
  let upload = document.querySelector('#upload3');
  let upload_input = upload.querySelector('.upload_ipt');
  let upload_button_select = upload.querySelector('.upload_button.select');
  let upload_button_upload = upload.querySelector('.upload_button.upload');
  let upload_abber = upload.querySelector('.upload_abber');
  let upload_abber_img = upload_abber.querySelector('img');
  let _file = null;

  //转化成base64，用于图片缩略图
  const changeBase64 = (file) => {
      return new Promise((resolve) => {
          let fileReader = new FileReader();
          fileReader.readAsDataURL(file);
          fileReader.onload = (e) => {
              resolve(e.target.result);
          };
      });
  };

  /**
   *
   * @param {} file
   * @returns
   * 根据内容生成hash名字
   */
  const changeBuffer = (file) => {
      return new Promise((resolve) => {
          let fileReader = new FileReader();
          fileReader.readAsArrayBuffer(file);  //转成buffer格式数据
          fileReader.onload = (e) => {
              let buffer = e.target.result;
              console.log(buffer);
              const spark = new SparkMD5.ArrayBuffer();
              spark.append(buffer);
              const HASH = spark.end();
              const suffix = /\.([0-9a-zA-Z]+)$/.exec(file.name)[1];
              console.log(HASH);
              resolve({
                  buffer,
                  HASH,
                  suffix,
                  filename: `${HASH}.${suffix}`,
              });
          };
      });
  };
  // 监听用户选择文件的操作
  upload_input.addEventListener('change', async function () {
      // 获取用户选择的文件
      console.log(upload_input.files, '???');
      let file = upload_input.files[0];
      /**
       * + name 文件名
       * + size 文件大小 B字节
       * + type 文件类型
       */
      if (!file) return;
      // 方案1: 限制文件上传的格式
      if (!/(png|jpg|jpeg)/i.test(file.type)) {
          alert('上传文件格式不正确');
      }
      // 限制文件上传的大小
      if (file.size > 2 * 1024 * 1024) {
          alert('上传文件不能超过2MB');
          return;
      }

      // 文件预览,将文件对象转成base64赋值给img-url
      
      const base64 = await changeBase64(file);
      _file = file;
      console.log('file: ', file);
      upload_abber_img.src = base64;
      upload_abber_img.style.display = 'block';

      // // 将上传的文件转成base64
      // base64 = await changeBase64(file)
      // upload_input.value = ''
      // // console.log(base64);
      // try {
      //     const data = await instance.post('/upload_single_base64', {
      //         file: encodeURIComponent(base64), // 防止乱码问题
      //         filename: file.name
      //     }, {
      //         headers: {
      //             'Content-Type': 'application/x-www-form-urlencoded'
      //         }
      //     })

      //     const { code } = data
      //     if (code === 0) {
      //         alert('文件上传成功!')
      //     }
      //     throw data.codeText; // 抛出异常
      // } catch (e) {
      //     // 文件上传错误
      // } finally {
      //     //
      // }
  });

  // 点击文件选择按钮,触发上传文件的行为
  upload_button_select.addEventListener('click', function () {
      upload_input.click();
  });

  //上传至服务器
  upload_button_upload.addEventListener('click', async function () {
      if (!_file) return alert('请选择图片');
      // 将文件传给服务器 FormData / base64

      // 生成文件buffer名字
      const { filename } = await changeBuffer(_file);

      let formData = new FormData();
      formData.append('file', _file);
      formData.append('filename', filename); // 处理名字,服务端不提供名字编译
      instance
          .post('/upload_single_name', formData)
          .then((res) => {
            console.log('res: ', res);
              const { code } = res;
              if (code === 0) {
                  alert('file 上传成功');
                  return;
              }
              console.log(res);
              return Promise.reject(data.codeText);
          })
          .catch((e) => {
              console.log(e);
          }).finally(() => {
            //重置操作
            _file = null;
            upload_abber_img.src = '';
            upload_abber_img.style.display = 'none';
          })
  });
})();

/**
 * 进度条管控方式
 */
 (function () {
  let upload = document.querySelector('#upload4');
  let upload_input = upload.querySelector('.upload_ipt');
  let upload_button_select = upload.querySelector('.upload_button.select');
  let upload_progress = upload.querySelector('.upload_progress');
  let upload_progrees_value = upload.querySelector('.progress');

  // 监听用户选择文件的操作
  upload_input.addEventListener('change', async function () {
      // 获取用户选择的文件
      console.log(upload_input.files, '???');

      let file = upload_input.files[0];
      /**
       * + name 文件名
       * + size 文件大小 B字节
       * + type 文件类型
       */
      if (!file) return;
      // 方案1: 限制文件上传的格式
      if (!/(png|jpg|jpeg)/i.test(file.type)) {
          alert('上传文件格式不正确');
      }
      // 限制文件上传的大小
      if (file.size > 10 * 1024 * 1024) {
          alert('上传文件不能超过2MB');
          return;
      }

      try {
          let formData = new FormData();
          formData.append('file', file);
          formData.append('filename', file.filename);
          const data = await instance.post('/upload_single', formData, {
            //文件上传中的回调函数 xhr.upload.onprogress
              onUploadProgress: (e) => {
                  console.log(e);
                  const { loaded, total } = e;
                  console.log(
                      `${(loaded / total) * 100}%`,
                      ' `${loaded/total*100}%`'
                  );
                  upload_progress.style.display = 'block';
                  upload_progrees_value.style.width = `${
                      (loaded / total) * 100
                  }%`;
              },
          });
          const { code ,url} = data;
          if (code === 0) {
              upload_progrees_value.style.width = `100%`;
              setTimeout(()=>{
                alert(`文件上传成功!，地址是：${url}`);
              },300)
              return;
          }
          throw data.codeText;
      } catch (e) {
          //
          console.log(e);
          alert('文件上传失败');
      } finally {
          //重置(可以添加，为了看效果，我这里暂时不添加)
          // upload_progress.style.display = 'none';
          // upload_progrees_value.style.width = `0%`;
      }
  });

  // 点击文件选择按钮,触发上传文件的行为
  upload_button_select.addEventListener('click', function () {
      upload_input.click();
  });
})();

jQuery(document).ready(function($) {
    const ajaxurl = wpaw_ajax.ajaxurl;
    const chatId = $('input[name="client_id"]').val();
    const senderId = $('input[name="sender_id"]').val();

    function loadMessages() {
        if (!chatId) return;
        var $chatBox = $('#chat-box');
        var offset = $chatBox.data('offset') || 0;

        $.post(ajaxurl, {
            action: 'wpaw_load_messages',
            client_id: chatId,
            sender_id: senderId,
            offset: offset,
            limit: 20
        }, function(response) {
            if (response.success && response.data.html) {
                $chatBox.html(response.data.html);
                $chatBox.data('offset', offset + 20);
                
                $('#chat-box').scrollTop($('#chat-box')[0].scrollHeight - $('#chat-box')[0].clientHeight);
            }
        });
    }


    // infinite scroll for chat messages with loader
    $('#chat-box').on('scroll', function () {
        var $this = $(this);

        if ($this.scrollTop() < 100 && !$this.data('loading')) {
            if ($this.data('no-more-messages')) {
                if ($this.data('no-download-messages')) {
                    return;
                }
                $this.data('no-download-messages', true);
                return;
            }

            $this.data('loading', true); // Prevent duplicate calls while loading

            var offset = $this.data('offset') || 0;

            // Optional: Show loader if needed
            $this.prepend('<div class="chat-loader">Loading...</div>');

            $.post(ajaxurl, {
                action: 'wpaw_load_messages',
                client_id: chatId,
                sender_id: senderId,
                offset: offset,
                limit: 20
            }, function (response) {
                $this.data('loading', false); // Allow new requests

                // Remove loader
                $this.find('.chat-loader').remove();

                if (response.success && response.data.html && response.data.html.trim() !== '0') {
                    $this.prepend(response.data.html);
                    $this.data('offset', offset + 20); // Update offset ONLY when successful
                } else {
                    $this.data('no-more-messages', true);
                    $this.prepend('<div class="chat-redownloader-container">No more chat in server. <br><button class="chat-redownloader-btn" data-offset="0">Redownload Chat from mobile</button></div>');

                    // Auto click the button
                    $('.chat-redownloader-btn').trigger('click');
                }
            });
        }
    });

     $(document).on('click', '#wpaw-reload-btn', function () {
        $('#chat-box').data('offset', 0); // Reset offset
        loadMessages();
     });

    // Handle redownload button click
    $(document).on('click', '.chat-redownloader-btn', function () {
        var $btn = $(this);

        // Prevent multiple clicks
        if ($btn.data('downloading')) return;

        $btn.data('downloading', true).text('Downloading...').prop('disabled', true);

        var offset = $btn.data('offset') || 0;
        var limit = 50;

        function fetchBatch(currentOffset,limit) {
            $.post(ajaxurl, {
                action: 'wpaw_download_chat',
                client_id: chatId,
                sender_id: senderId,
                offset: currentOffset,
                limit: limit,
            }, function (response) {
                if (response.success) {
                    console.log('Batch downloaded:', response.data);
                    if (response.data.no_more === true) {
                        $btn.data('no-more-messages', true);
                        $btn.text('No more messages to download');
                        $btn.prop('disabled', true);
                        $btn.data('downloading', false); // allow retry if needed
    
                    } else {
                        var newOffset = currentOffset + limit;
                        $btn.data('offset', newOffset);
                        fetchBatch(newOffset,limit); // auto continue downloading
                    }
                } else {
                    $btn.text('Failed. Retry?');
                    $btn.prop('disabled', false);
                    $btn.data('downloading', false);
                }
            });
        }
        
        fetchBatch(offset,limit); // initial trigger
    });
            
    function AUTWADownloadMessages(currentOffset,limit) {
        var $btn = $('.chat-redownloader-btn');
            $.post(ajaxurl, {
                action: 'wpaw_download_chat',
                client_id: chatId,
                sender_id: senderId,
                offset: currentOffset,
                limit: limit,
            }, function (response) {
                if (response.success) {
                    console.log('Batch downloaded:', response.data);
                    if (response.data.no_more === true) {
                        $btn.data('no-more-messages', true);
                        $btn.text('No more messages to download');
                        $btn.prop('disabled', true);
                        $btn.data('downloading', false); // allow retry if needed
    
                    } else {
                        var newOffset = currentOffset + limit;
                        $btn.data('offset', newOffset);
                        AUTWADownloadMessages(newOffset,limit); // auto continue downloading
                    }
                } else {
                    $btn.text('Failed. Retry?');
                    $btn.prop('disabled', false);
                    $btn.data('downloading', false);
                }
            });
        }
        
                
        window.AUTWADownloadMessages = AUTWADownloadMessages;

    // Toggle dropdown (fix: use event delegation and .mediaUpload parent)
    $(document).off('click', '#media-upload-btn').on('click', '#media-upload-btn', function(e){
        e.preventDefault();
        $(this).siblings('.dropdown-media-type').toggle();
        $(this).toggleClass('active');
        e.stopPropagation();
    });

    // Hide dropdown on click outside (fix: only if not inside .mediaUpload)
    $(document).off('click.mediaDropdown').on('click.mediaDropdown', function(e){
        if (!$(e.target).closest('.mediaUpload').length) {
            $('.dropdown-media-type').hide();
            $('#media-upload-btn').removeClass('active');
        }
    });

    // Click on dropdown option
    $('.dropdown-media-type .media-type').on('click', function(e){
        e.preventDefault();
        $('#media-upload-btn').removeClass('active');
        var type = $(this).data('type');
        if(type === 'image'){
            $('#media-image-input').click();
        } else if(type === 'file'){
            $('#media-file-input').click();
        }
        $('.dropdown-media-type').hide();
    });

    // Helper to update message type
    function updateMessageType() {
        let imageFiles = $('#media-image-input')[0].files;
        let otherFiles = $('#media-file-input')[0].files;
        let $msgType = $('#AUTWA-send-form').find('input[name="message_type"]');
        let type = 'text';
        if (imageFiles.length > 0) {
            type = 'image';
        } else if (otherFiles.length > 0) {
            type = 'file';
        }
        if ($msgType.length) {
            $msgType.val(type);
        } else {
            $('#AUTWA-send-form').append('<input type="hidden" name="message_type" value="'+type+'">');
        }
    }

    // Helper to trim file name to max 30 chars
    function trimFileName(name, maxLen = 30) {
        if (name.length > maxLen) {
            return name.substring(0, maxLen) + '...';
        }
        return name;
    }

    // Helper to create a progress bar for each file
    function createProgressBar() {
        return '<div class="media-progress-bar" style="width:80px;height:6px;background:#eee;margin-top:2px;border-radius:3px;overflow:hidden;">' +
            '<div class="media-progress-inner" style="width:0%;height:100%;background:#4caf50;"></div>' +
        '</div>';
    }

    // Patch image preview to include progress bar
    $('#media-image-input').off('change').on('change', function(e){
        let files = Array.from(this.files);
        let maxSize = 4 * 1024 * 1024; // 4MB
        let $preview = $('#media-preview');
        // Instead of empty, append new files to existing preview
        let existingFiles = $preview.data('imageFiles') || [];
        let valid = true;
        let newFiles = [];
        files.forEach(function(file, i){
            if(file.size > maxSize){
                alert('Image "'+file.name+'" exceeds 4MB.');
                valid = false;
                return;
            }
            // Prevent duplicate file names
            if (existingFiles.some(f => f.name === file.name && f.size === file.size)) return;
            newFiles.push(file);
            let idx = existingFiles.length + newFiles.length - 1;
            let reader = new FileReader();
            reader.onload = function(e){
                let imgHtml = '<div class="media-preview-item" data-file-index="'+idx+'" data-type="image" data-name="'+file.name+'" style="display:inline-block;margin:3px;text-align:center;position:relative;">' +
                    '<img src="'+e.target.result+'" style="width:80px;height:80px;object-fit:cover;border-radius:4px;display:block;">' +
                    '<input type="text" class="media-caption" name="media_image_captions[]" placeholder="Caption" style="width:80px;margin-top:2px;font-size:11px;">' +
                    createProgressBar() +
                    '<button type="button" class="unselect-media-btn" data-type="image" data-name="'+file.name+'" style="position:absolute;top:2px;right:2px;background:#fff;border:1px solid #ccc;border-radius:50%;width:18px;height:18px;line-height:16px;padding:0;font-size:13px;cursor:pointer;">&times;</button>' +
                    '</div>';
                $preview.append(imgHtml);
                $preview.css('display', 'flex');
            };
            reader.readAsDataURL(file);
        });
        if(!valid) return $(this).val('');
        // Merge new files with existing
        let allFiles = existingFiles.concat(newFiles);
        $preview.data('imageFiles', allFiles);
        // Update the input's FileList (not possible directly, so recreate input)
        if (allFiles.length > 0) {
            let dt = new DataTransfer();
            allFiles.forEach(f => dt.items.add(f));
            this.files = dt.files;
        }
        updateMessageType();
    });

    // Patch file preview to include progress bar
    $('#media-file-input').off('change').on('change', function(e){
        let files = Array.from(this.files);
        let maxSize = 80 * 1024 * 1024; // 80MB
        let $preview = $('#media-preview');
        let existingFiles = $preview.data('fileFiles') || [];
        let valid = true;
        let newFiles = [];
        files.forEach(function(file, i){
            if(file.size > maxSize){
                alert('File "'+file.name+'" exceeds 80MB.');
                valid = false;
                return;
            }
            if (existingFiles.some(f => f.name === file.name && f.size === file.size)) return;
            newFiles.push(file);
            let idx = existingFiles.length + newFiles.length - 1;
            let displayName = trimFileName(file.name, 30);
            let fileHtml = '<div class="media-preview-item" data-file-index="'+idx+'" data-type="file" data-name="'+file.name+'" style="display:inline-block;margin:3px;text-align:center;position:relative;">' +
                '<span style="background:#eee;padding:2px 6px;border-radius:3px;color:#000;display:block;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+displayName+'</span>' +
                '<input type="text" class="media-caption" name="media_file_captions[]" placeholder="Caption" style="width:80px;margin-top:2px;font-size:11px;">' +
                createProgressBar() +
                '<button type="button" class="unselect-media-btn" data-type="file" data-name="'+file.name+'" style="position:absolute;top:2px;right:2px;background:#fff;border:1px solid #ccc;border-radius:50%;width:18px;height:18px;line-height:16px;padding:0;font-size:13px;cursor:pointer;">&times;</button>' +
                '</div>';
            $preview.append(fileHtml);
            $preview.css('display', 'flex');
        });
        if(!valid) return $(this).val('');
        let allFiles = existingFiles.concat(newFiles);
        $preview.data('fileFiles', allFiles);
        if (allFiles.length > 0) {
            let dt = new DataTransfer();
            allFiles.forEach(f => dt.items.add(f));
            this.files = dt.files;
        }
        updateMessageType();
    });

    // Unselect media button (remove only the clicked file)
    $('#media-preview').off('click', '.unselect-media-btn').on('click', '.unselect-media-btn', function(){
        let $item = $(this).closest('.media-preview-item');
        let type = $item.data('type');
        let name = $item.data('name');
        let idx = $item.data('file-index');
        let $preview = $('#media-preview');
        if (type === 'image') {
            let files = $preview.data('imageFiles') || [];
            files = files.filter(f => f.name !== name);
            $preview.data('imageFiles', files);
            // Update input
            let dt = new DataTransfer();
            files.forEach(f => dt.items.add(f));
            $('#media-image-input')[0].files = dt.files;
            if (files.length === 0) $('#media-image-input').val('');
        } else if (type === 'file') {
            let files = $preview.data('fileFiles') || [];
            files = files.filter(f => f.name !== name);
            $preview.data('fileFiles', files);
            let dt = new DataTransfer();
            files.forEach(f => dt.items.add(f));
            $('#media-file-input')[0].files = dt.files;
            if (files.length === 0) $('#media-file-input').val('');
        }
        $item.remove();
        if ($('#media-preview .media-preview-item').length === 0) {
            $('#media-preview').css('display', 'none');
        }
        updateMessageType();
    });
                        
    $('#new-chat-button').on('click', function() {
        let newNumber = $('#new-chat-number').val();
        if (newNumber.trim() === '') {
            alert('Please enter a phone number.');
            return;
        }

        $.post(ajaxurl, {
            action: 'wpaw_create_new_chat',
            number: newNumber
        }, function(response) {
            if (response.success) {
                window.location.href = `?page=wp-auto-whats&chat=${response.data.client_id}`;
            } else {
                alert('Failed to create new chat.');
            }
        });
    });
    
    // Auto-refresh messages every 3 seconds
    //setInterval(loadMessages, 5000);
    loadMessages();
    // Expose loadMessages so it can be called from elsewhere
    window.AUTWALoadMessages = loadMessages;
    window.AUTWALoadNewMessages = loadNewMessages;

    // Helper to upload a single file with progress (move this above the submit handler so it's defined)
    function uploadMediaFile(file, type, caption, onProgress, onSuccess, onError) {
        let formData = new FormData();
        formData.append('action', 'wpaw_upload_media');
        formData.append('media_type', type);
        formData.append('media_file', file);
        formData.append('media_caption', caption);
        formData.append('_wpnonce', wpaw_ajax.nonce);
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            xhr: function() {
                var xhr = new window.XMLHttpRequest();
                xhr.upload.addEventListener('progress', function(evt) {
                    if (evt.lengthComputable) {
                        var percent = Math.round((evt.loaded / evt.total) * 100);
                        onProgress(percent);
                    }
                }, false);
                return xhr;
            },
            success: function(response) {
                if (response.success && response.data && response.data.url) {
                    onSuccess(response.data.url);
                } else {
                    onError(response.data && response.data.message ? response.data.message : 'Upload failed');
                }
            },
            error: function(xhr, status, error) {
                onError(error);
            }
        });
    }
    function loadNewMessages() {
        // if (!chatId) return;
        // $.post(ajaxurl, {
        //     action: 'wpaw_load_messages',
        //     client_id: chatId,
        //     sender_id: senderId,
        //     offset: 0,
        //     limit: 1
        // }, function(response) {
        //     if (response.success && response.data.html) {
        //         $('#chat-box').append(response.data.html);
        //         // Scroll to top if near top
        //         function scrollDown() {
        //             document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight - document.getElementById('chat-box').clientHeight;
        //         }
        //         scrollDown();
        //     }
        // });
        $('#chat-box').data('offset', 0); // Reset offset
        loadMessages();
    }
    // Fix: Prevent double submit, disable send button during upload/send
    $('#AUTWA-send-form').off('submit').on('submit', function(e) {
        e.preventDefault();
        let $form = $(this);
        let $sendBtn = $form.find('button[type="submit"]');
        if ($sendBtn.prop('disabled')) return; // Prevent double click
        $sendBtn.prop('disabled', true).text('Sending...');
        let reply_to = $form.find('input[name="reply_to"]').val() || '';
        let message = $form.find('textarea[name="message"]').val();
        let chatId = $form.find('input[name="client_id"]').val();
        let senderId = $form.find('input[name="auto_whats_id"]').val();
        let imageFiles = $('#media-image-input')[0].files;
        let fileFiles = $('#media-file-input')[0].files;
        let imageCaptions = [];
        let fileCaptions = [];
        $('#media-preview .media-caption[name="media_image_captions[]"]').each(function(){
            imageCaptions.push($(this).val());
        });
        $('#media-preview .media-caption[name="media_file_captions[]"]').each(function(){
            fileCaptions.push($(this).val());
        });
        let uploads = [];
        for(let i=0; i<imageFiles.length; i++){
            uploads.push({file: imageFiles[i], type: 'image', caption: imageCaptions[i] || '', index: i});
        }
        for(let i=0; i<fileFiles.length; i++){
            uploads.push({file: fileFiles[i], type: 'file', caption: fileCaptions[i] || '', index: i});
        }
        if (uploads.length === 0) {
            // Always use FormData, but only send the correct fields for wpaw_send_message
            let formData = new FormData();
            formData.append('action', 'wpaw_send_message');
            formData.append('client_id', chatId);
            formData.append('sender_id', senderId);
            formData.append('message', message);
            formData.append('reply_to', reply_to);
            formData.append('_wpnonce', wpaw_ajax.nonce);
            // If message_type is present, add it
            let $msgType = $form.find('input[name="message_type"]');
            if ($msgType.length) formData.append('message_type', $msgType.val());
            $.ajax({
                url: ajaxurl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response){
                    $sendBtn.prop('disabled', false).text('Send');
                    if (response.success) {
                        loadNewMessages();
                        $form[0].reset();
                        $('#media-preview').empty().css('display', 'none');
                        updateMessageType();
                    } else {
                        alert('Failed to send message.');
                    }
                },
                error: function(){
                    $sendBtn.prop('disabled', false).text('Send');
                }
            });
            return;
        }
        let uploadedMedia = [];
        let failed = false;
        function uploadNext(idx) {
            if (idx >= uploads.length) {
                let formData = new FormData();
                formData.append('action', 'wpaw_send_message');
                formData.append('client_id', chatId);
                formData.append('sender_id', senderId);
                formData.append('message', message);
                formData.append('reply_to', reply_to);
                formData.append('_wpnonce', wpaw_ajax.nonce);
                uploadedMedia.forEach(function(item) {
                    if (item.type === 'image') {
                        formData.append('aw_media_images[]', item.url);
                        formData.append('aw_media_image_captions[]', item.caption);
                    } else {
                        formData.append('aw_media_files[]', item.url);
                        formData.append('aw_media_file_captions[]', item.caption);
                    }
                });
                let messageType = uploadedMedia.some(m => m.type === 'image') ? 'image' : 'file';
                formData.append('message_type', messageType);
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response){
                        $sendBtn.prop('disabled', false).text('Send');
                        if (response.success) {
                            loadNewMessages();
                            $form[0].reset();
                            $('#media-preview').empty().css('display', 'none');
                            updateMessageType();
                        } else {
                            alert('Failed to send message.');
                        }
                    },
                    error: function(){
                        $sendBtn.prop('disabled', false).text('Send');
                    }
                });
                return;
            }
            let item = uploads[idx];
            let $progress = $('#media-preview .media-preview-item[data-file-index="'+item.index+'"] .media-progress-inner');
            uploadMediaFile(item.file, item.type, item.caption, function(percent){
                $progress.css('width', percent+'%');
            }, function(url){
                $progress.css('width', '100%');
                uploadedMedia.push({type: item.type, url: url, caption: item.caption});
                uploadNext(idx+1);
            }, function(errorMsg){
                $progress.css('background', '#f44336');
                alert('Upload failed: ' + errorMsg);
                $sendBtn.prop('disabled', false).text('Send');
                failed = true;
            });
        }
        uploadNext(0);
    });
});

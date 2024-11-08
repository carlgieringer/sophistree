#!/bin/sh

set -eu

script_name=$(basename $0)
# Pick from https://github.com/mozilla/pdf.js/releases
# E.g. https://github.com/mozilla/pdf.js/releases/download/v4.7.76/pdfjs-4.7.76-dist.zip
release_zip=$1
zip_filename=$(basename $release_zip)

dest_dir=public/pdfjs-dist

rm -r $dest_dir
mkdir -p $dest_dir

curl -L $release_zip --output $zip_filename
unzip -d $dest_dir $zip_filename
rm $zip_filename

# Remove example content from viewer
rm $dest_dir/web/*.pdf

# Remove the check that the PDF being loaded is from the same origin as the
# viewer.
sed -i '' -e 's/HOSTED_VIEWER_ORIGINS.includes(viewerOrigin)/true \/* Sophistree *\//' $dest_dir/web/viewer.mjs

# Modify the viewer HTML page to load Sophistree's content scripts and styles.
sed -i '' -e 's%</head>%<link rel="stylesheet" href="/content.css" /></head>%' $dest_dir/web/viewer.html
sed -i '' -e 's%</body>%<script src="/content.js"></script></body>%' $dest_dir/web/viewer.html

# Add a README to make it super-obvious that $DEST_DIR contains generated files which
# should not be manually edited.
cat <<END > $dest_dir/SOPHISTREE-README.md
# Sophistree README

This is an adaptation of PDF.js's distribution for Sophistree auto-generated by $script_name.
END

# Look for `const pdfjsVersion = '<VERSION>'` line in source and extract VERSION.
pdfjs_version=$(grep pdfjsVersion $dest_dir/web/viewer.mjs | egrep -o '[0-9.]+')

echo Successfully updated PDF.js to $pdfjs_version